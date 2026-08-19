import assert from "node:assert/strict"
import { mock, test } from "node:test"

let findFirstResult = null
let storedAssets = []
// Keyed by storage key, so a test can prove the builder reads the *stored*
// manifest document rather than anything carried over from ingest.
let storedObjects = new Map()

mock.module("../db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        findFirst: async () => findFirstResult,
      },
      privateArtifactAsset: {
        findMany: async () => storedAssets,
      },
    },
  },
})

mock.module("../storage", {
  namedExports: {
    getObjectBytes: async (key) => {
      const value = storedObjects.get(key)
      if (value === undefined) {
        throw new Error(`Object not found: ${key}`)
      }
      return new TextEncoder().encode(value)
    },
    // The rest of the module's surface, needed because mock.module replaces
    // it wholesale and assets.ts/relay.ts sit in this import graph. Reaching
    // any of them from the manifest builder is itself the bug: it builds an
    // entry out of recorded metadata and one manifest document, and must not
    // touch artifact bytes.
    getObjectStream: async () => {
      throw new Error("the manifest builder must not stream artifact bytes")
    },
    putObject: async () => {
      throw new Error("the manifest builder must not write to storage")
    },
    deleteObject: async () => {
      throw new Error("the manifest builder must not delete from storage")
    },
    getPresignedDownloadUrl: async () => {
      throw new Error("the manifest builder must not presign an object-store URL")
    },
  },
})

const { buildPrivateArtifactManifest } = await import("./manifest.ts")

const MANIFEST_TOML_KEY = "private-artifacts/org-1/artifact-1/manifest_toml"

const SCHEMA_INPUT = "schemas/firecrawl/scrape.input.v1.json"
const SCHEMA_OUTPUT = "schemas/firecrawl/scrape.output.v1.json"
const PROMPT_DOC = "prompts/firecrawl/scrape.md"

// Only the tables `declaredAssetPaths` reads; the rest of a real manifest.toml
// is irrelevant to which assets it declares.
const MANIFEST_TOML = `
schema_version = "3"

[[tools]]
name = "scrape"
input_schema_ref = "${SCHEMA_INPUT}"
output_schema_ref = "${SCHEMA_OUTPUT}"
prompt_doc_ref = "${PROMPT_DOC}"
`

function baseInput() {
  return {
    organizationId: "org-1",
    artifactId: "artifact-1",
    token: "tok",
    baseUrl: "https://hub.example",
    generatedAt: "2026-08-17T00:00:00.000Z",
  }
}

function toolArtifact(contentKinds) {
  return {
    id: "artifact-1",
    type: "tool",
    name: "firecrawl",
    version: "0.1.0",
    description: "desc",
    content: contentKinds.map((kind) => ({
      kind,
      sha256: `sha-${kind}`,
      sizeBytes: kind.length,
      storageKey: `private-artifacts/org-1/artifact-1/${kind}`,
    })),
  }
}

function asset(kind, path) {
  return {
    kind,
    path,
    storageKey: `private-artifacts/org-1/artifact-1/assets/${kind}/${path}`,
    sha256: `sha-${path}`,
    sizeBytes: path.length,
  }
}

/** The default fixture: a v3 tool declaring two schemas and one prompt, with
 * all three stored -- i.e. a tool that should publish and install. */
function completeToolFixture() {
  findFirstResult = toolArtifact(["wasm", "manifest_toml"])
  storedObjects = new Map([[MANIFEST_TOML_KEY, MANIFEST_TOML]])
  storedAssets = [
    asset("schema", SCHEMA_INPUT),
    asset("schema", SCHEMA_OUTPUT),
    asset("prompt", PROMPT_DOC),
  ]
}

async function buildTool() {
  const manifest = await buildPrivateArtifactManifest(baseInput())
  assert.equal(manifest.tools.length, 1)
  return manifest.tools[0]
}

// --- Task 5.1 / 5.4: published set equals declared set ----------------------

test("task 5.1: publishes every declared schema and prompt as a path-keyed artifact", async () => {
  completeToolFixture()

  const tool = await buildTool()

  assert.deepEqual(Object.keys(tool.schemas), [SCHEMA_INPUT, SCHEMA_OUTPUT])
  assert.deepEqual(Object.keys(tool.prompts), [PROMPT_DOC])
  assert.equal(tool.schemas[SCHEMA_INPUT].sha256, `sha-${SCHEMA_INPUT}`)
  assert.equal(tool.schemas[SCHEMA_INPUT].size_bytes, SCHEMA_INPUT.length)
  assert.equal(tool.prompts[PROMPT_DOC].sha256, `sha-${PROMPT_DOC}`)
})

test("task 5.1: an asset URL spells the declared path verbatim on the hub origin", async () => {
  completeToolFixture()

  const tool = await buildTool()

  // The agent revalidates every artifact URL against the catalog origin (C2)
  // and then matches the published key against its own declared path (C9), so
  // neither the host nor the path may be transformed on the way out.
  assert.equal(
    tool.schemas[SCHEMA_INPUT].url,
    `https://hub.example/api/private-artifacts/artifact-1/asset/schema/tok/${SCHEMA_INPUT}`
  )
  assert.equal(
    tool.prompts[PROMPT_DOC].url,
    `https://hub.example/api/private-artifacts/artifact-1/asset/prompt/tok/${PROMPT_DOC}`
  )
  for (const artifact of [
    tool.wasm,
    tool.capabilities,
    tool.manifest,
    ...Object.values(tool.schemas),
    ...Object.values(tool.prompts),
  ]) {
    assert.ok(
      artifact.url.startsWith("https://hub.example/"),
      `expected ${artifact.url} to sit on the catalog origin`
    )
  }
})

test("task 5.4: a stored asset the manifest does not declare is not published", async () => {
  completeToolFixture()
  storedAssets = [...storedAssets, asset("schema", "schemas/firecrawl/orphan.json")]

  const tool = await buildTool()

  // C9 is an equality, not a superset: the agent rejects an extra published
  // artifact exactly as hard as a missing one.
  assert.deepEqual(Object.keys(tool.schemas), [SCHEMA_INPUT, SCHEMA_OUTPUT])
})

test("task 5.3: a declared asset with no stored counterpart fails generation, naming the path", async () => {
  completeToolFixture()
  storedAssets = storedAssets.filter((stored) => stored.path !== SCHEMA_OUTPUT)

  await assert.rejects(
    () => buildPrivateArtifactManifest(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )

  // Named, so the owner can go fix the one asset rather than re-upload blind.
  try {
    await buildPrivateArtifactManifest(baseInput())
    assert.fail("expected manifest generation to fail")
  } catch (error) {
    assert.match(await error.text(), new RegExp(SCHEMA_OUTPUT))
  }
})

test("a declared prompt is checked against the prompt namespace, not the schema one", async () => {
  completeToolFixture()
  // Same path, stored under the wrong kind: the two namespaces are matched
  // independently, so this must not satisfy the prompt declaration.
  storedAssets = [
    asset("schema", SCHEMA_INPUT),
    asset("schema", SCHEMA_OUTPUT),
    asset("schema", PROMPT_DOC),
  ]

  await assert.rejects(
    () => buildPrivateArtifactManifest(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )
})

test("a tool with no manifest.toml declares nothing and publishes no assets", async () => {
  // Pre-bundle-ingest shape: wasm uploaded directly, no extension manifest.
  // Nothing is declared, so nothing may be published -- including any asset
  // rows that happen to exist.
  findFirstResult = toolArtifact(["wasm"])
  storedObjects = new Map()
  storedAssets = [asset("schema", SCHEMA_INPUT)]

  const tool = await buildTool()

  assert.equal("schemas" in tool, false)
  assert.equal("prompts" in tool, false)
  assert.equal("manifest" in tool, false)
})

test("empty asset maps are omitted rather than published as {}", async () => {
  findFirstResult = toolArtifact(["wasm", "manifest_toml"])
  storedObjects = new Map([[MANIFEST_TOML_KEY, `schema_version = "3"\n`]])
  storedAssets = []

  const manifest = await buildPrivateArtifactManifest(baseInput())
  const serialized = JSON.parse(JSON.stringify(manifest.tools[0]))

  assert.equal("schemas" in serialized, false)
  assert.equal("prompts" in serialized, false)
})

// --- Task 5.2: capabilities is unconditional --------------------------------

test("task 5.2: publishes the capabilities stub when no capabilities row exists", async () => {
  completeToolFixture()

  const tool = await buildTool()

  // C7: the field has no serde default, so an entry without it fails the parse
  // of the whole manifest. The stub's advertised size and digest must describe
  // the bytes the content route serves for the same URL.
  assert.ok(tool.capabilities)
  assert.equal(tool.capabilities.size_bytes, 2)
  assert.equal(
    tool.capabilities.sha256,
    "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
  )
  assert.equal(
    tool.capabilities.url,
    "https://hub.example/api/private-artifacts/artifact-1/content/capabilities/tok"
  )
})

test("task 5.2: a stored capabilities document is preferred over the stub", async () => {
  completeToolFixture()
  findFirstResult = toolArtifact(["wasm", "capabilities", "manifest_toml"])

  const tool = await buildTool()

  assert.equal(tool.capabilities.sha256, "sha-capabilities")
  assert.notEqual(tool.capabilities.size_bytes, 2)
})

// --- Unchanged behaviour ----------------------------------------------------

test("emits the optional manifest hub artifact when manifest_toml exists", async () => {
  completeToolFixture()

  const tool = await buildTool()

  assert.ok(tool.manifest, "expected the manifest hub artifact to be present")
  assert.equal(tool.manifest.sha256, "sha-manifest_toml")
  assert.match(tool.manifest.url, /\/content\/manifest_toml\//)
  assert.ok(tool.wasm)
})

test("still throws 409 when a required (non-optional) kind is missing", async () => {
  completeToolFixture()
  findFirstResult = toolArtifact([]) // wasm missing -- still unconditionally required

  await assert.rejects(
    () => buildPrivateArtifactManifest(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )
})

test("skills are unaffected: no tool fields are ever attached to a skill entry", async () => {
  findFirstResult = {
    id: "artifact-2",
    type: "skill",
    name: "my-skill",
    version: "0.1.0",
    description: "desc",
    content: [
      {
        kind: "skill_md",
        sha256: "sha-skill_md",
        sizeBytes: 10,
        storageKey: "private-artifacts/org-1/artifact-2/skill_md",
      },
    ],
  }
  storedObjects = new Map()
  storedAssets = []

  const manifest = await buildPrivateArtifactManifest(baseInput())

  assert.equal(manifest.skills.length, 1)
  assert.equal(manifest.tools.length, 0)
  for (const field of ["manifest", "capabilities", "schemas", "prompts"]) {
    assert.equal(field in manifest.skills[0], false)
  }
})
