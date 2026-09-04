import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mock, test } from "node:test"

// Isolates resolveInstallArtifact from the real catalog filesystem scan
// (getMarketplaceCatalogItem walks tools/ + skills/ via readTools/readSkills).
// Which branch a test takes is now decided by the request's `source`, not by
// whether this returns a row, so the public tests below set both catalogs and
// assert which one answered.
let marketplaceItem = null
mock.module("@/lib/catalog/server", {
  namedExports: {
    getMarketplaceCatalogItem: async () => marketplaceItem,
  },
})

// Mocked even for the private tests that never call it, because
// manifest.server.ts's own import graph uses a TS parameter-property class
// field the plain `node --test` strip-types loader can't parse, and a static
// `import` evaluates the whole module regardless of whether the test path
// reaches it.
let unifiedManifest = { tools: [], skills: [] }
mock.module("@/lib/catalog/manifest.server", {
  namedExports: {
    buildUnifiedManifest: async () => unifiedManifest,
  },
})

const ORGANIZATION_ID = "org-1"
const ORGANIZATION_NAME = "Acme Robotics"

let findFirstResult = null
let memberUserIds = ["user-1"]
let storedAssets = []
let storedObjects = new Map()

/** `{ some: { userId } }` -- the membership clause, wherever it is nested. */
const isMember = (members) => memberUserIds.includes(members?.some?.userId)

mock.module("@/lib/db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        // Applies the parts of the `where` clause the tests turn on rather
        // than returning the fixture unconditionally: the membership clause
        // is the only authorization on this path, so a mock that ignored it
        // would let the non-member test pass against a query that had
        // dropped it. The manifest builder re-reads the same row by id while
        // resolution reads it by name, so one fake serves both and
        // discriminates on which key the caller sent.
        findFirst: async ({ where }) => {
          if (!findFirstResult) return null
          if (where.id) {
            return where.id === findFirstResult.id ? findFirstResult : null
          }
          if (where.name !== findFirstResult.name) return null
          if (where.organizationId !== ORGANIZATION_ID) return null
          return isMember(where.organization?.members) ? findFirstResult : null
        },
      },
      organization: {
        findFirst: async ({ where }) =>
          where.id === ORGANIZATION_ID && isMember(where.members)
            ? { name: ORGANIZATION_NAME }
            : null,
      },
      privateArtifactAsset: {
        findMany: async () => storedAssets,
      },
    },
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    getObjectBytes: async (key) => {
      const value = storedObjects.get(key)
      if (value === undefined) throw new Error(`Object not found: ${key}`)
      return new TextEncoder().encode(value)
    },
    getObjectStream: async () => {
      throw new Error("install resolution must not stream artifact bytes")
    },
    putObject: async () => {
      throw new Error("install resolution must not write to storage")
    },
    deleteObject: async () => {
      throw new Error("install resolution must not delete from storage")
    },
    getPresignedDownloadUrl: async () => {
      throw new Error("install resolution must not presign an object-store URL")
    },
  },
})

process.env.NEXT_PUBLIC_APP_URL = "https://hub.example"
process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET = "a".repeat(32)

const { resolveInstallArtifact } = await import("./service.ts")
const { buildPrivateArtifactManifest } = await import(
  "@/lib/private-artifacts/manifest"
)
const { verifyArtifactToken } = await import("@/lib/private-artifacts/token")
const {
  ARTIFACT_TOKEN_TTL_SECONDS,
  INSTALL_CLICK_THROUGH_WINDOW_SECONDS,
} = await import("./install-timing.ts")

const MANIFEST_TOML_KEY = "private-artifacts/org-1/artifact-1/manifest_toml"
const SCHEMA_INPUT = "schemas/firecrawl/scrape.input.v1.json"
const SCHEMA_OUTPUT = "schemas/firecrawl/scrape.output.v1.json"
const PROMPT_DOC = "prompts/firecrawl/scrape.md"

const MANIFEST_TOML = `
schema_version = "3"

[[tools]]
name = "scrape"
input_schema_ref = "${SCHEMA_INPUT}"
output_schema_ref = "${SCHEMA_OUTPUT}"
prompt_doc_ref = "${PROMPT_DOC}"
`

function toolArtifact(contentKinds) {
  return {
    id: "artifact-1",
    name: "firecrawl",
    version: "0.1.0",
    type: "tool",
    description: "desc",
    content: contentKinds.map((kind) => ({
      kind,
      sha256: `sha-${kind}`,
      sizeBytes: 8,
      storageKey: `private-artifacts/org-1/artifact-1/${kind}`,
    })),
  }
}

function asset(kind, path, sha256 = `sha-${path}`) {
  return {
    kind,
    path,
    storageKey: `private-artifacts/org-1/artifact-1/assets/${kind}/${path}`,
    sha256,
    sizeBytes: 16,
  }
}

/** A public marketplace tool entry, digestible by toolEntryArtifactDigest. */
function publicToolEntry(name, sha = "public-wasm") {
  return {
    name,
    crate_name: name,
    version: "9.9.9",
    description: "the public one",
    provenance: "official",
    wasm: {
      url: `https://hub.example/${name}.wasm`,
      size_bytes: 4,
      sha256: sha,
    },
    capabilities: {
      url: `https://hub.example/${name}.capabilities.json`,
      size_bytes: 2,
      sha256: "public-capabilities",
    },
  }
}

/** Publishes `name` in the marketplace catalog and in the unified manifest. */
function publishPublicTool(name) {
  marketplaceItem = { slug: name, version: "9.9.9", kind: "tool" }
  unifiedManifest = { tools: [publicToolEntry(name)], skills: [] }
}

/** A v3 tool declaring two schemas and one prompt, all stored. */
function completeToolFixture() {
  marketplaceItem = null
  unifiedManifest = { tools: [], skills: [] }
  memberUserIds = ["user-1"]
  findFirstResult = toolArtifact(["wasm", "manifest_toml"])
  storedObjects = new Map([[MANIFEST_TOML_KEY, MANIFEST_TOML]])
  storedAssets = [
    asset("schema", SCHEMA_INPUT),
    asset("schema", SCHEMA_OUTPUT),
    asset("prompt", PROMPT_DOC),
  ]
}

function baseInput(overrides = {}) {
  return {
    slug: "firecrawl",
    source: "private",
    type: "tool",
    userId: "user-1",
    organizationId: ORGANIZATION_ID,
    ...overrides,
  }
}

/**
 * `tool_artifact_digest` from `ironclaw:.../ironhub/catalog.rs`, reimplemented
 * here from the Rust rather than by calling the hub's own function.
 *
 * The point of task 6.3 is that the hub and the agent independently arrive at
 * the same number from the published entry. Asserting the hub against itself
 * would prove only that it is deterministic, so this is the agent's side of
 * the comparison, written out: NUL-separated fields, wasm then capabilities
 * then the optional manifest, then every schema and every prompt in sorted
 * order, each contributing its path and its digest as two NUL-terminated
 * fields.
 */
function recomputeAsAgentWould(entry) {
  let material = `wasm:${entry.wasm.sha256}\0capabilities:${entry.capabilities.sha256}\0`
  if (entry.manifest) {
    material += `manifest:${entry.manifest.sha256}\0`
  }
  for (const [label, assets] of [
    ["schema", entry.schemas],
    ["prompt", entry.prompts],
  ]) {
    for (const path of Object.keys(assets ?? {}).sort()) {
      material += `${label}:${path}\0${assets[path].sha256}\0`
    }
  }
  return `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`
}

/** The agent's own sequence: resolve an install, then fetch the manifest that
 * the install's token points at, and recompute the digest from its entry. */
async function resolveAndRepublish() {
  const resolved = await resolveInstallArtifact(baseInput())
  const manifest = await buildPrivateArtifactManifest({
    organizationId: "org-1",
    artifactId: "artifact-1",
    token: resolved.privateManifest.token,
    baseUrl: "https://hub.example",
    generatedAt: "2026-08-17T00:00:00.000Z",
  })
  return { resolved, entry: manifest.tools[0] }
}

// --- Task 9.1 / 9.3 ---------------------------------------------------------

test("task 9.1: the artifact token minted for an install carries the 15-minute TTL", async () => {
  completeToolFixture()
  const before = Math.floor(Date.now() / 1000)

  const resolved = await resolveInstallArtifact(baseInput())

  const claims = JSON.parse(
    Buffer.from(resolved.privateManifest.token.split(".")[1], "base64url").toString(
      "utf8"
    )
  )
  const ttl = claims.exp - before
  // Asserted against the constant, not against a literal, so the two cannot
  // drift; asserted at all because this is the number D8 says was too small.
  assert.ok(
    ttl >= ARTIFACT_TOKEN_TTL_SECONDS && ttl <= ARTIFACT_TOKEN_TTL_SECONDS + 2,
    `expected a ~${ARTIFACT_TOKEN_TTL_SECONDS}s TTL, got ${ttl}s`
  )
})

test("task 9.3: the token outlives a worst-case click-through plus a full download sequence", async () => {
  completeToolFixture()

  const resolved = await resolveInstallArtifact(baseInput())
  const issuedAt = Date.now()

  // The two clocks start together, so the click-through is spent out of the
  // download budget rather than before it (design.md D8). Take the whole of
  // it -- the agent will not accept a delivery any later than this (C16).
  const clickThroughMs = INSTALL_CLICK_THROUGH_WINDOW_SECONDS * 1000

  // Then the download sequence, which C17 makes strictly sequential. A
  // 20-capability tool fetches wasm + capabilities + manifest.toml + 20 input
  // schemas + 20 prompt documents = 43 requests; at 10s each -- a third of the
  // agent's 30s per-request timeout -- that is 430s.
  const downloadMs = 43 * 10 * 1000

  assert.doesNotThrow(() =>
    verifyArtifactToken(
      resolved.privateManifest.token,
      issuedAt + clickThroughMs + downloadMs
    )
  )

  // The old 300s TTL did not even survive the click-through: at the latest
  // moment the agent would still accept the delivery, the token it was handed
  // had already expired. That is the defect this change closes.
  assert.ok(
    ARTIFACT_TOKEN_TTL_SECONDS - INSTALL_CLICK_THROUGH_WINDOW_SECONDS >= 600,
    "at least 10 minutes of download budget must survive a full click-through"
  )
})

test("the token still expires at the end of its own window", async () => {
  completeToolFixture()

  const resolved = await resolveInstallArtifact(baseInput())
  const issuedAt = Date.now()

  assert.throws(
    () =>
      verifyArtifactToken(
        resolved.privateManifest.token,
        issuedAt + (ARTIFACT_TOKEN_TTL_SECONDS + 60) * 1000
      ),
    (error) => error instanceof Response && error.status === 403
  )
})

// --- Task 6.3 ---------------------------------------------------------------

test("task 6.3: the delivered digest equals what the agent recomputes from the manifest", async () => {
  completeToolFixture()

  const { resolved, entry } = await resolveAndRepublish()

  assert.equal(resolved.digest, recomputeAsAgentWould(entry))
})

test("task 6.3: every published asset is folded into the delivered digest", async () => {
  completeToolFixture()
  const { resolved: withAssets } = await resolveAndRepublish()

  // The same tool with nothing declared: if schemas and prompts were not in
  // the material, these two would collide -- which is exactly the D4 bug.
  storedObjects = new Map([[MANIFEST_TOML_KEY, `schema_version = "3"\n`]])
  storedAssets = []
  const { resolved: withoutAssets } = await resolveAndRepublish()

  assert.notEqual(withAssets.digest, withoutAssets.digest)
})

// --- Task 6.4 ---------------------------------------------------------------

test("task 6.4: replacing one schema asset's content changes the tool digest", async () => {
  completeToolFixture()
  const { resolved: before } = await resolveAndRepublish()

  storedAssets = [
    asset("schema", SCHEMA_INPUT, "sha-scrape-input-v2"),
    asset("schema", SCHEMA_OUTPUT),
    asset("prompt", PROMPT_DOC),
  ]
  const { resolved: after, entry } = await resolveAndRepublish()

  assert.notEqual(before.digest, after.digest)
  assert.equal(after.digest, recomputeAsAgentWould(entry))
})

test("a schema and a prompt at the same path do not digest alike", async () => {
  // The `schema:` / `prompt:` labels are the only thing separating the two
  // namespaces in the material.
  completeToolFixture()
  storedObjects = new Map([
    [
      MANIFEST_TOML_KEY,
      `schema_version = "3"\n\n[[tools]]\nname = "s"\ninput_schema_ref = "shared/thing.json"\n`,
    ],
  ])
  storedAssets = [asset("schema", "shared/thing.json", "sha-shared")]
  const { resolved: asSchema } = await resolveAndRepublish()

  storedObjects = new Map([
    [
      MANIFEST_TOML_KEY,
      `schema_version = "3"\n\n[[tools]]\nname = "s"\ninput_schema_ref = "${SCHEMA_INPUT}"\nprompt_doc_ref = "shared/thing.json"\n`,
    ],
  ])
  storedAssets = [
    asset("schema", SCHEMA_INPUT, "sha-shared"),
    asset("prompt", "shared/thing.json", "sha-shared"),
  ]
  const { resolved: asPrompt } = await resolveAndRepublish()

  assert.notEqual(asSchema.digest, asPrompt.digest)
})

// --- Capabilities (C7) ------------------------------------------------------

test("the capabilities stub is what the digest folds in when no document is stored", async () => {
  completeToolFixture()

  const { resolved, entry } = await resolveAndRepublish()

  assert.equal(
    entry.capabilities.sha256,
    "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
  )
  assert.equal(resolved.digest, recomputeAsAgentWould(entry))
})

test("a stored capabilities document changes the digest away from the stub's", async () => {
  completeToolFixture()
  const { resolved: withStub } = await resolveAndRepublish()

  findFirstResult = toolArtifact(["wasm", "capabilities", "manifest_toml"])
  const { resolved: withDocument, entry } = await resolveAndRepublish()

  assert.equal(entry.capabilities.sha256, "sha-capabilities")
  assert.notEqual(withStub.digest, withDocument.digest)
})

// --- Unchanged behaviour ----------------------------------------------------

test("resolves a capabilities-less private tool (wasm + manifest_toml only) instead of throwing", async () => {
  // This is the exact shape a bundle upload with no *.capabilities.json
  // produces (design.md D3/D6): content_complete already treats it as
  // complete, so install resolution must not disagree and call it
  // "missing installable content".
  completeToolFixture()

  const resolved = await resolveInstallArtifact(baseInput())

  assert.equal(resolved.slug, "firecrawl")
  assert.equal(resolved.version, "0.1.0")
  assert.ok(resolved.digest.startsWith("sha256:"))
  assert.ok(resolved.privateManifest?.url.includes("/api/private-artifacts/manifest/"))
})

test("still refuses when wasm itself is missing -- wasm remains unconditionally required", async () => {
  // Now surfaced by the manifest builder as a 409 rather than by a second
  // content check here: resolution digests the entry it would publish, so an
  // unpublishable artifact stops at the same point for the same reason.
  completeToolFixture()
  findFirstResult = toolArtifact(["manifest_toml"])

  await assert.rejects(
    () => resolveInstallArtifact(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )
})

test("a declared asset that was never stored blocks the install rather than the download", async () => {
  completeToolFixture()
  storedAssets = storedAssets.filter((stored) => stored.path !== PROMPT_DOC)

  await assert.rejects(
    () => resolveInstallArtifact(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )
})

// --- Source selection -------------------------------------------------------

/**
 * Resolution refuses with a thrown `Response`, whose body is a stream and so
 * cannot be read from `assert.rejects`'s synchronous validator. Captured here
 * instead, as the pair every assertion below is written against.
 */
async function refusal(input) {
  try {
    await resolveInstallArtifact(input)
  } catch (error) {
    assert.ok(error instanceof Response, `expected a Response, got ${error}`)
    return { status: error.status, message: await error.text() }
  }
  assert.fail("expected the install to be refused")
}

test("source 'public' resolves against the marketplace catalog", async () => {
  completeToolFixture()
  publishPublicTool("firecrawl")

  const resolved = await resolveInstallArtifact(baseInput({ source: "public" }))

  assert.equal(resolved.version, "9.9.9")
  // A public install carries no manifest token: the agent fetches a public
  // artifact from the catalog origin, not through a per-install grant.
  assert.equal(resolved.privateManifest, undefined)
})

test("a private artifact shadowing a public name is reachable under source 'private'", async () => {
  // The defect this change closes: both catalogs publish `firecrawl`, and
  // resolution used to try public first and never reach the user's own item.
  completeToolFixture()
  publishPublicTool("firecrawl")

  const resolved = await resolveInstallArtifact(
    baseInput({ source: "private" })
  )

  assert.equal(resolved.version, "0.1.0")
  assert.ok(
    resolved.privateManifest?.url.includes("/api/private-artifacts/manifest/")
  )
})

test("source 'public' does not fall back to a private artifact of the same name", async () => {
  completeToolFixture()
  marketplaceItem = null

  const { status, message } = await refusal(baseInput({ source: "public" }))

  assert.equal(status, 404)
  assert.match(message, /No public marketplace entry is named "firecrawl"/)
})

test("source 'private' does not fall back to a public entry of the same name", async () => {
  completeToolFixture()
  publishPublicTool("firecrawl")
  findFirstResult = null

  const { status, message } = await refusal(baseInput({ source: "private" }))

  assert.equal(status, 404)
  assert.match(message, /No artifact named "firecrawl"/)
})

// --- Private resolution errors ----------------------------------------------

test("a private miss names the organization that was searched", async () => {
  completeToolFixture()
  findFirstResult = null

  const { message } = await refusal(baseInput())

  assert.match(
    message,
    /No artifact named "firecrawl" exists in "Acme Robotics"/
  )
})

test("a non-member is refused without being told the organization's name", async () => {
  // The membership clause matches nothing for this caller, so the refusal
  // reads exactly like an absent name -- naming the workspace would confirm
  // which organization the id belongs to. It is also raised before the token
  // is minted, which is the point: resolution returns no value at all, so
  // there is nothing signed or granted to leak.
  completeToolFixture()
  memberUserIds = []

  const { status, message } = await refusal(baseInput())

  assert.equal(status, 404)
  assert.match(message, /your active organization/)
  assert.ok(!message.includes(ORGANIZATION_NAME))
})

test("a session with no active organization is told no private space is selected", async () => {
  completeToolFixture()

  const { status, message } = await refusal(
    baseInput({ organizationId: undefined })
  )

  assert.equal(status, 400)
  assert.match(message, /No private space is selected/)
})

test("a type mismatch names both the expected and the stored type", async () => {
  completeToolFixture()

  const { status, message } = await refusal(baseInput({ type: "skill" }))

  assert.equal(status, 409)
  assert.match(message, /is a tool/)
  assert.match(message, /not a skill/)
})

test("a private skill still resolves with the unchanged C14 formula", async () => {
  marketplaceItem = null
  findFirstResult = {
    id: "artifact-1",
    name: "my-skill",
    version: "0.2.0",
    type: "skill",
    description: "desc",
    content: [
      {
        kind: "skill_md",
        sha256: "sha-skill_md",
        sizeBytes: 12,
        storageKey: "private-artifacts/org-1/artifact-1/skill_md",
      },
    ],
  }
  storedAssets = []
  storedObjects = new Map()

  const resolved = await resolveInstallArtifact(
    baseInput({ slug: "my-skill", type: "skill" })
  )

  // skill_artifact_digest with no bundled files: SHA-256 over the skill
  // document's SHA *string*, which is what the hub has always produced.
  assert.equal(
    resolved.digest,
    `sha256:${createHash("sha256").update("sha-skill_md", "utf8").digest("hex")}`
  )
})

// --- add-artifact-versioning task 4.3 ----------------------------------------

test("an install resolved after a version bump carries the new version", async () => {
  completeToolFixture()

  const before = await resolveInstallArtifact(baseInput())
  assert.equal(before.version, "0.1.0")

  // What a bump leaves behind: one row, one version string, replaced in place.
  // Resolution reads it live rather than from anything captured at publish, so
  // the payload's `version` field -- which the agent compares against what it
  // already installed -- moves with it.
  findFirstResult = { ...findFirstResult, version: "0.2.0" }

  const after = await resolveInstallArtifact(baseInput())

  assert.equal(after.version, "0.2.0")
  assert.equal(after.slug, before.slug)
})

// --- Souls ------------------------------------------------------------------

test("a private soul resolves with the soul digest over its document", async () => {
  marketplaceItem = null
  unifiedManifest = { tools: [], skills: [] }
  memberUserIds = ["user-1"]
  storedObjects = new Map()
  storedAssets = []
  findFirstResult = {
    id: "artifact-1",
    name: "careful-analyst",
    version: "1.0.0",
    type: "soul",
    description: "desc",
    content: [
      {
        kind: "soul_md",
        sha256: "sha-soul_md",
        sizeBytes: 64,
        storageKey: "private-artifacts/org-1/artifact-1/soul_md",
      },
      // Stored but hub-only: it must not move the digest by so much as a bit.
      {
        kind: "readme_md",
        sha256: "sha-readme_md",
        sizeBytes: 32,
        storageKey: "private-artifacts/org-1/artifact-1/readme_md",
      },
    ],
  }

  const resolved = await resolveInstallArtifact(
    baseInput({ slug: "careful-analyst", type: "soul" })
  )

  const { soulArtifactDigest } = await import(
    "@/lib/catalog/ironclaw-contract"
  )
  assert.equal(resolved.digest, soulArtifactDigest("sha-soul_md"))
  assert.equal(resolved.version, "1.0.0")
  assert.ok(resolved.privateManifest.url.includes("/private-artifacts/manifest/"))
})

test("asking to install a soul that is really a skill is refused, naming both", async () => {
  marketplaceItem = null
  unifiedManifest = { tools: [], skills: [] }
  memberUserIds = ["user-1"]
  storedObjects = new Map()
  storedAssets = []
  findFirstResult = {
    id: "artifact-1",
    name: "careful-analyst",
    version: "1.0.0",
    type: "skill",
    description: "desc",
    content: [],
  }

  try {
    await resolveInstallArtifact(
      baseInput({ slug: "careful-analyst", type: "soul" })
    )
    assert.fail("expected the type assertion to reject")
  } catch (error) {
    assert.ok(error instanceof Response)
    assert.equal(error.status, 409)
    assert.match(await error.text(), /is a skill in this workspace, not a soul/)
  }
})

// --- Task 6.1: the token kind an install mints ------------------------------

test("task 6.1: a tool install still carries a single-artifact token", async () => {
  completeToolFixture()

  const resolved = await resolveInstallArtifact(baseInput())
  const claims = verifyArtifactToken(resolved.privateManifest.token)

  // The regression guard on the path already in production: loadouts added a
  // second token kind, and nothing about a tool's install may have moved.
  assert.equal(claims.artifactId, "artifact-1")
  assert.equal(claims.loadoutId, undefined)
})

test("task 6.1: a loadout is still refused before an install token is minted", async () => {
  // Where this workstream stops. `InstallArtifactType` has no `loadout`, so
  // the type assertion refuses one here and install delivery stays unbuilt
  // (blocked on IronClaw asks 4 and 5). The mint below it is already
  // loadout-correct -- see mintInstallTokenForArtifact -- so wiring delivery
  // is a change to the accepted types and the payload, not to the credential.
  marketplaceItem = null
  unifiedManifest = { tools: [], skills: [] }
  memberUserIds = ["user-1"]
  storedObjects = new Map()
  storedAssets = []
  findFirstResult = {
    id: "loadout-1",
    name: "trader",
    version: "1.0.0",
    type: "loadout",
    description: "desc",
    content: [],
  }

  try {
    await resolveInstallArtifact(baseInput({ slug: "trader", type: "tool" }))
    assert.fail("expected the type assertion to reject")
  } catch (error) {
    assert.ok(error instanceof Response)
    assert.equal(error.status, 409)
    assert.match(await error.text(), /is a loadout in this workspace, not a tool/)
  }
})
