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

const { buildPrivateArtifactEntry, buildPrivateArtifactManifest } =
  await import("./manifest.ts")

const { soulArtifactDigest } = await import("@/lib/catalog/ironclaw-contract")

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

// --- Souls ------------------------------------------------------------------
//
// The load-bearing property is negative: `readme_md` must not appear in the
// document and must not reach the digest. Both directions are asserted,
// because an omission is exactly the kind of thing that survives a refactor
// unnoticed until an agent stores a file nobody meant to publish.

function soulArtifact(contentKinds) {
  return {
    id: "artifact-3",
    type: "soul",
    name: "careful-analyst",
    version: "1.0.0",
    description: "A cautious, citation-first persona.",
    content: contentKinds.map((kind) => ({
      kind,
      sha256: `sha-${kind}`,
      sizeBytes: kind.length,
      storageKey: `private-artifacts/org-1/artifact-3/${kind}`,
    })),
  }
}

function soulFixture(contentKinds) {
  findFirstResult = soulArtifact(contentKinds)
  storedObjects = new Map()
  storedAssets = []
}

test("a soul publishes as a skill entry carrying the soul document and no files", async () => {
  soulFixture(["soul_md"])

  const manifest = await buildPrivateArtifactManifest(baseInput())

  assert.equal(manifest.tools.length, 0)
  assert.equal(manifest.skills.length, 1)
  const skill = manifest.skills[0]
  assert.equal(skill.name, "careful-analyst")
  assert.equal(skill.trunk, "careful-analyst")
  assert.equal(skill.version, "1.0.0")
  assert.equal(skill.description, "A cautious, citation-first persona.")
  assert.equal(skill.provenance, "private")
  assert.equal(skill.skill_md.sha256, "sha-soul_md")
  assert.match(skill.skill_md.url, /\/content\/soul_md\//)
  // Absent, not `[]`: the agent switches digest formula on whether the list
  // is empty, and the two framings are not extensions of each other.
  assert.equal("files" in skill, false)
})

test("a manifest built for a soul with a readme carries no readme URL anywhere", async () => {
  soulFixture(["soul_md", "readme_md"])

  const manifest = await buildPrivateArtifactManifest(baseInput())

  // Searched over the serialized document rather than over the fields we
  // happen to know about: the point is that no URL for the readme reaches an
  // agent by any route, including one added later. Driven off the hub-only
  // set so a second such kind is covered the day it is added.
  const { HUB_ONLY_CONTENT_KINDS } = await import("./content.ts")
  const serialized = JSON.stringify(manifest)
  for (const kind of HUB_ONLY_CONTENT_KINDS) {
    assert.equal(serialized.includes(kind), false, `${kind} reached the manifest`)
    assert.equal(serialized.includes(`sha-${kind}`), false)
  }
  assert.ok(HUB_ONLY_CONTENT_KINDS.has("readme_md"))
  assert.equal(manifest.skills[0].skill_md.sha256, "sha-soul_md")
})

test("a soul's digest is unchanged by adding or removing its readme", async () => {
  soulFixture(["soul_md"])
  const withoutReadme = await buildPrivateArtifactEntry(baseInput())

  soulFixture(["soul_md", "readme_md"])
  const withReadme = await buildPrivateArtifactEntry(baseInput())

  assert.equal(
    soulArtifactDigest(withReadme.skill.skill_md.sha256),
    soulArtifactDigest(withoutReadme.skill.skill_md.sha256)
  )
})

test("a soul entry is discriminated as a soul, not as a skill", async () => {
  soulFixture(["soul_md"])

  const entry = await buildPrivateArtifactEntry(baseInput())

  // The published shape is a skill entry; the entry is not. Verification and
  // the install digest both branch on this.
  assert.equal(entry.type, "soul")
})

test("a soul with no stored document fails generation with 409", async () => {
  soulFixture([])

  await assert.rejects(
    () => buildPrivateArtifactManifest(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )
})

test("a soul that stored only a readme is still missing its document", async () => {
  soulFixture(["readme_md"])

  try {
    await buildPrivateArtifactManifest(baseInput())
    assert.fail("expected manifest generation to fail")
  } catch (error) {
    assert.ok(error instanceof Response)
    assert.equal(error.status, 409)
    assert.match(await error.text(), /soul_md/)
  }
})

// --- Loadouts: the multi-entry document and its digest -----------------------
//
// A loadout's members are resolved elsewhere (composition and member health);
// what arrives here is the list of entries they resolved to, private and
// public alike. These tests are therefore over hand-built entries plus one
// built by the real builder, which is what the install path will hand over.

const { privateManifestDocument, loadoutEntryArtifactDigest } = await import(
  "./manifest.ts"
)
const { loadoutArtifactDigest, skillEntryArtifactDigest, toolEntryArtifactDigest } =
  await import("@/lib/catalog/ironclaw-contract")

function hubArtifact(sha256) {
  return { url: `https://hub.example/${sha256}`, size_bytes: 10, sha256 }
}

function toolEntry(name, sha256) {
  return {
    type: "tool",
    tool: {
      name,
      crate_name: name,
      version: "1.0.0",
      description: "",
      provenance: "private",
      wasm: hubArtifact(`wasm-${sha256}`),
      capabilities: hubArtifact(`cap-${sha256}`),
    },
  }
}

function skillEntry(name, sha256, type = "skill") {
  return {
    type,
    skill: {
      name,
      trunk: name,
      version: "1.0.0",
      description: "",
      provenance: "private",
      skill_md: hubArtifact(sha256),
    },
  }
}

/** Mixed sources and all three kinds, in no useful order. */
function loadoutEntries() {
  return [
    skillEntry("trader", "soul-sha", "soul"),
    toolEntry("risk-tool", "risk"),
    skillEntry("chart", "chart-sha"),
    toolEntry("near-rpc", "near"),
  ]
}

test("task 4.1: every member becomes an entry in the array for its kind", async () => {
  const document = privateManifestDocument({
    artifactId: "loadout-1",
    entries: loadoutEntries(),
    generatedAt: "2026-09-04T00:00:00.000Z",
  })

  assert.deepEqual(
    document.tools.map((tool) => tool.name),
    ["risk-tool", "near-rpc"]
  )
  // The soul rides in skills[] with the skills, because the agent has no
  // souls[] to put it in yet -- but it is still one entry per member.
  assert.deepEqual(
    document.skills.map((skill) => skill.name),
    ["trader", "chart"]
  )
  assert.equal(document.release_tag, "private-loadout-1")
  assert.equal(document.repo, "ironhub-private")
  assert.equal(document.generated_at, "2026-09-04T00:00:00.000Z")
})

test("task 4.1: a loadout of one kind leaves the other array empty rather than absent", async () => {
  const document = privateManifestDocument({
    artifactId: "loadout-2",
    entries: [toolEntry("near-rpc", "near")],
    generatedAt: "2026-09-04T00:00:00.000Z",
  })

  assert.equal(document.tools.length, 1)
  assert.deepEqual(document.skills, [])
})

test("task 4.1: an entry built for a single artifact is the same entry a loadout carries", async () => {
  // The seam that matters: a member is published by the same builder whether
  // it is installed alone or inside a loadout, so the two cannot drift.
  completeToolFixture()
  const entry = await buildPrivateArtifactEntry(baseInput())

  const alone = await buildPrivateArtifactManifest(baseInput())
  const inLoadout = privateManifestDocument({
    artifactId: "loadout-3",
    entries: [entry, skillEntry("trader", "soul-sha", "soul")],
    generatedAt: baseInput().generatedAt,
  })

  assert.deepEqual(inLoadout.tools[0], alone.tools[0])
  // Only the release tag differs: the document is served for the loadout.
  assert.equal(inLoadout.release_tag, "private-loadout-3")
  assert.equal(alone.release_tag, "private-artifact-1")
})

test("task 4.4: the install digest is taken over the entries the document publishes", async () => {
  const entries = loadoutEntries()

  // Spelled out from the entries rather than delegated, so this test fails if
  // a member's kind label or its per-member formula changes -- in particular
  // if the soul stops being digested as a soul.
  assert.equal(
    loadoutEntryArtifactDigest(entries),
    loadoutArtifactDigest([
      {
        kind: "tool",
        name: "risk-tool",
        digest: toolEntryArtifactDigest(entries[1].tool),
      },
      {
        kind: "tool",
        name: "near-rpc",
        digest: toolEntryArtifactDigest(entries[3].tool),
      },
      {
        kind: "skill",
        name: "chart",
        digest: skillEntryArtifactDigest(entries[2].skill),
      },
      {
        kind: "soul",
        name: "trader",
        digest: soulArtifactDigest(entries[0].skill.skill_md.sha256),
      },
    ])
  )
})

test("task 4.3: the entries' order changes the document but not the digest", async () => {
  const entries = loadoutEntries()
  const reordered = [...entries].reverse()

  assert.equal(
    loadoutEntryArtifactDigest(reordered),
    loadoutEntryArtifactDigest(entries)
  )
  // Stated the other way round too: the document is not silently sorted, so
  // the digest's order-independence is the digest's own property.
  const document = privateManifestDocument({
    artifactId: "loadout-4",
    entries: reordered,
    generatedAt: "2026-09-04T00:00:00.000Z",
  })
  assert.deepEqual(
    document.tools.map((tool) => tool.name),
    ["near-rpc", "risk-tool"]
  )
})

test("task 4.4: a member's content moves the loadout digest", async () => {
  const entries = loadoutEntries()
  const before = loadoutEntryArtifactDigest(entries)

  const changed = loadoutEntries()
  changed[0] = skillEntry("trader", "soul-sha-v2", "soul")

  assert.notEqual(loadoutEntryArtifactDigest(changed), before)
})

test("task 4.4: a member's token and URLs never reach the loadout digest", async () => {
  // Tokens are minted per install and URLs carry them, so a digest that saw
  // either would differ on every install of an unchanged loadout -- and the
  // agent recomputes from the SHA fields alone.
  const entries = loadoutEntries()
  const rehosted = loadoutEntries()
  rehosted[3].tool.wasm = {
    url: "https://elsewhere.example/x?tok=2",
    size_bytes: 999,
    sha256: rehosted[3].tool.wasm.sha256,
  }

  assert.equal(
    loadoutEntryArtifactDigest(rehosted),
    loadoutEntryArtifactDigest(entries)
  )
})

test("task 4.4: no loadout digest is stored anywhere on the way through", async () => {
  // The digest is minted with the payload and nothing writes it back: the
  // module's storage mock fails any write, and the pure functions above take
  // no persistence at all. Asserted as a property of the signature so the day
  // someone adds a cache, this test is what says why they should not
  // (design.md -- computed at install, not at publish).
  assert.equal(loadoutEntryArtifactDigest.length, 1)
  assert.equal(
    loadoutEntryArtifactDigest(loadoutEntries()),
    loadoutEntryArtifactDigest(loadoutEntries())
  )
})
