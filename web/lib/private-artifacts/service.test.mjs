import assert from "node:assert/strict"
import { mock, test } from "node:test"

/**
 * Minimal in-memory fake for the subset of the Prisma Client API used by
 * service.ts. `findFirst`/`update` intentionally ignore `select`/`include`
 * shape (real Prisma projects fields; callers here only assert on the
 * fields they care about), but `findFirst` does honor the `organizationId`
 * scoping since several 404-on-cross-org behaviors depend on it.
 */
function makeFakeDb() {
  const artifacts = new Map()

  return {
    artifacts,
    prisma: {
      privateArtifact: {
        create: async ({ data }) => {
          const record = {
            status: "draft",
            description: null,
            sourceUrl: null,
            category: null,
            content: [],
            ...data,
          }
          artifacts.set(record.id, record)
          return { ...record, content: [...record.content] }
        },
        findFirst: async ({ where }) => {
          const record = artifacts.get(where.id)
          if (!record || record.organizationId !== where.organizationId) {
            return null
          }
          return { ...record, content: [...record.content] }
        },
        update: async ({ where, data }) => {
          const record = artifacts.get(where.id)
          Object.assign(record, data)
          return { ...record, content: [...record.content] }
        },
      },
      // Only the lookup checkCapabilitiesValidJson needs (a storageKey for
      // the artifact's "capabilities" content row), keyed off the same
      // in-memory artifacts the privateArtifact fake above manages.
      // Publish-time verification (checkAgentContract) builds the entry the
      // artifact would publish, which reads the artifact's stored assets. None
      // of these fixtures declare any, so an empty set is the honest answer.
      privateArtifactAsset: {
        findMany: async () => [],
      },
      privateArtifactContent: {
        findFirst: async ({ where }) => {
          const record = artifacts.get(where.artifactId)
          if (!record || record.organizationId !== where.artifact.organizationId) {
            return null
          }
          const hasKind = record.content.some((c) => c.kind === where.kind)
          return hasKind ? { storageKey: `${where.artifactId}/${where.kind}` } : null
        },
      },
    },
  }
}

const { prisma, artifacts } = makeFakeDb()

mock.module("../db", { namedExports: { prisma } })

let objectBytes = new TextEncoder().encode("{}")
// Set to an Error to simulate the object store being unreachable, which must
// stay distinguishable from bytes that simply do not parse.
let storageError = null
// What the stored manifest.toml reads back as. Publish-time verification
// re-derives the declared asset set from it (never from anything carried over
// from ingest), so it has to be a parseable document; declaring no assets
// keeps these fixtures about the checks rather than about asset publishing.
let manifestTomlBytes = new TextEncoder().encode('schema_version = "3"\n')
mock.module("../storage", {
  namedExports: {
    getObjectStream: async () => {
      if (storageError) throw storageError
      return objectBytes
    },
    getObjectBytes: async () => manifestTomlBytes,
    putObject: async () => {
      throw new Error("service.ts must not write to storage")
    },
    deleteObject: async () => {
      throw new Error("service.ts must not delete from storage")
    },
    getPresignedDownloadUrl: async () => {
      throw new Error("service.ts must not presign an object-store URL")
    },
  },
})

// Valid per lib/catalog/catalog-origin.ts, so publish-time verification checks
// the artifact rather than reporting the deployment.
process.env.NEXT_PUBLIC_APP_URL = "https://hub.example"

const {
  createPrivateArtifact,
  updatePrivateArtifact,
  publishPrivateArtifact,
  unpublishPrivateArtifact,
  getArtifactChecks,
} = await import("./service.ts")

function seedArtifact(overrides = {}) {
  const id = overrides.id ?? `artifact-${artifacts.size + 1}`
  const record = {
    id,
    organizationId: "org-1",
    createdById: "user-1",
    type: "tool",
    name: "my-tool",
    title: "My Tool",
    version: "1.0.0",
    visibility: "private",
    status: "draft",
    description: null,
    sourceUrl: null,
    category: null,
    content: [],
    ...overrides,
  }
  artifacts.set(id, record)
  return record
}

function baseCreateInput(overrides = {}) {
  return {
    type: "tool",
    name: "my-tool",
    title: "My Tool",
    version: "1.0.0",
    ...overrides,
  }
}

// --- category validation ---------------------------------------------

test("createPrivateArtifact accepts a category from the shared CATEGORIES list", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "cat-ok", category: "Dev Tools" })
  )
  assert.equal(artifact.category, "Dev Tools")
})

test("createPrivateArtifact rejects an unknown category with 400", async () => {
  await assert.rejects(
    () =>
      createPrivateArtifact(
        "org-1",
        "user-1",
        baseCreateInput({ name: "cat-bad", category: "Nonsense" })
      ),
    (error) => error instanceof Response && error.status === 400
  )
})

test("createPrivateArtifact leaves category null when omitted", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "cat-omit" })
  )
  assert.ok(artifact.category === null || artifact.category === undefined)
})

test("updatePrivateArtifact accepts a valid category patch", async () => {
  const seeded = seedArtifact({ id: "patch-cat-ok" })
  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    category: "Automation",
  })
  assert.equal(artifact.category, "Automation")
})

test("updatePrivateArtifact rejects an unknown category patch with 400", async () => {
  const seeded = seedArtifact({ id: "patch-cat-bad" })
  await assert.rejects(
    () => updatePrivateArtifact("org-1", seeded.id, { category: "Nonsense" }),
    (error) => error instanceof Response && error.status === 400
  )
})

// --- sourceUrl host/protocol tightening --------------------------------

test("createPrivateArtifact accepts an https github.com sourceUrl", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({
      name: "repo-ok",
      sourceUrl: "https://github.com/org/repo",
    })
  )
  assert.equal(artifact.sourceUrl, "https://github.com/org/repo")
})

test("createPrivateArtifact accepts an https www.gitlab.com sourceUrl", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({
      name: "repo-www",
      sourceUrl: "https://www.gitlab.com/org/repo",
    })
  )
  assert.equal(artifact.sourceUrl, "https://www.gitlab.com/org/repo")
})

test("createPrivateArtifact rejects a non-allow-listed host with 400", async () => {
  await assert.rejects(
    () =>
      createPrivateArtifact(
        "org-1",
        "user-1",
        baseCreateInput({
          name: "repo-bad-host",
          sourceUrl: "https://example.com/repo",
        })
      ),
    (error) => error instanceof Response && error.status === 400
  )
})

test("createPrivateArtifact rejects a non-https allow-listed host with 400", async () => {
  await assert.rejects(
    () =>
      createPrivateArtifact(
        "org-1",
        "user-1",
        baseCreateInput({
          name: "repo-bad-protocol",
          sourceUrl: "http://github.com/org/repo",
        })
      ),
    (error) => error instanceof Response && error.status === 400
  )
})

test("updatePrivateArtifact applies the same sourceUrl restriction", async () => {
  const seeded = seedArtifact({ id: "patch-repo-bad" })
  await assert.rejects(
    () =>
      updatePrivateArtifact("org-1", seeded.id, {
        sourceUrl: "https://bitbucket.org.evil.com/org/repo",
      }),
    (error) => error instanceof Response && error.status === 400
  )
})

test("createPrivateArtifact rejects a sourceUrl with a non-default port", async () => {
  await assert.rejects(
    () =>
      createPrivateArtifact(
        "org-1",
        "user-1",
        baseCreateInput({
          name: "repo-port",
          sourceUrl: "https://github.com:8443/org/repo",
        })
      ),
    (error) => error instanceof Response && error.status === 400
  )
})

test("updatePrivateArtifact returns the artifact's content summary like publish/unpublish do", async () => {
  const seeded = seedArtifact({
    id: "patch-includes-content",
    content: [{ kind: "wasm" }],
  })
  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    title: "Renamed",
  })
  assert.deepEqual(
    artifact.content.map((c) => c.kind),
    ["wasm"]
  )
})

// --- publish / unpublish lifecycle --------------------------------------

test("publishPrivateArtifact is blocked by a missing category", async () => {
  const seeded = seedArtifact({
    id: "pub-no-category",
    content: [{ kind: "wasm" }, { kind: "capabilities" }],
    category: null,
  })
  await assert.rejects(
    () => publishPrivateArtifact("org-1", seeded.id),
    (error) => error instanceof Response && error.status === 409
  )
  assert.equal(artifacts.get(seeded.id).status, "draft")
})

test("publishPrivateArtifact is blocked by missing required content", async () => {
  const seeded = seedArtifact({
    id: "pub-no-content",
    content: [{ kind: "capabilities" }],
    category: "Dev Tools",
  })
  await assert.rejects(
    () => publishPrivateArtifact("org-1", seeded.id),
    (error) => error instanceof Response && error.status === 409
  )
  assert.equal(artifacts.get(seeded.id).status, "draft")
})

test("publishPrivateArtifact succeeds once content and category are both set", async () => {
  // design.md D3: a tool's required kinds are wasm + manifest_toml.
  // capabilities is optional and deliberately absent here to prove it is no
  // longer part of the completeness gate.
  const seeded = seedArtifact({
    id: "pub-ok",
    content: [{ kind: "wasm" }, { kind: "manifest_toml" }],
    category: "Dev Tools",
  })
  const artifact = await publishPrivateArtifact("org-1", seeded.id)
  assert.equal(artifact.status, "published")
})

test("publishPrivateArtifact 409s naming manifest_toml for a tool with wasm + capabilities but no manifest_toml", async () => {
  // The exact "pre-existing tool" shape design.md D3 calls out: created
  // before bundle ingest existed, so it has capabilities but never got a
  // manifest_toml row. This is a deliberate breaking change to
  // completeness, not a bug -- the 409 must name manifest_toml so the owner
  // knows to re-upload as a zip.
  const seeded = seedArtifact({
    id: "pub-pre-bundle-ingest-tool",
    content: [{ kind: "wasm" }, { kind: "capabilities" }],
    category: "Dev Tools",
  })
  let threw = false
  try {
    await publishPrivateArtifact("org-1", seeded.id)
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 409)
    const text = await error.text()
    assert.match(text, /manifest_toml/)
  }
  assert.ok(threw, "expected publishPrivateArtifact to throw")
  assert.equal(artifacts.get(seeded.id).status, "draft")
})

test("unpublishPrivateArtifact returns a published artifact to draft", async () => {
  const seeded = seedArtifact({
    id: "unpub-ok",
    content: [{ kind: "wasm" }, { kind: "capabilities" }],
    category: "Dev Tools",
    status: "published",
  })
  const artifact = await unpublishPrivateArtifact("org-1", seeded.id)
  assert.equal(artifact.status, "draft")
})

// --- review checks --------------------------------------------------------

test("getArtifactChecks reports every check pass/warn and publishable for a complete tool", async () => {
  process.env.IRONHUB_MANIFEST_SIGNING_KEY = "dummy-key"
  objectBytes = new TextEncoder().encode('{"ok":true}')

  const seeded = seedArtifact({
    id: "checks-tool-complete",
    type: "tool",
    category: "Dev Tools",
    sourceUrl: "https://github.com/org/repo",
    content: [
      { kind: "wasm" },
      { kind: "capabilities" },
      { kind: "manifest_toml" },
    ],
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)

  assert.ok(checks.every((check) => check.status !== "fail"))
  assert.equal(publishable, true)
  const ids = checks.map((check) => check.id)
  assert.deepEqual(ids, [
    "content_complete",
    "capabilities_valid_json",
    "wasm_present",
    "agent_contract",
    "category_set",
    "repo_link_set",
    "signing_key_configured",
  ])
})

test("getArtifactChecks reports skill_md_present for a skill artifact", async () => {
  const seeded = seedArtifact({
    id: "checks-skill",
    type: "skill",
    category: null,
    content: [],
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
  const skillCheck = checks.find((check) => check.id === "skill_md_present")

  assert.ok(skillCheck)
  assert.equal(skillCheck.status, "fail")
  assert.equal(publishable, false)
  const categoryCheck = checks.find((check) => check.id === "category_set")
  assert.equal(categoryCheck.status, "fail")
})

test("getArtifactChecks reports capabilities_valid_json as fail when the stored bytes do not parse", async () => {
  objectBytes = new TextEncoder().encode("not json")

  const seeded = seedArtifact({
    id: "checks-corrupt-capabilities",
    type: "tool",
    category: "Dev Tools",
    content: [{ kind: "wasm" }, { kind: "capabilities" }],
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
  const capCheck = checks.find((check) => check.id === "capabilities_valid_json")

  assert.equal(capCheck.status, "fail")
  assert.equal(publishable, false)
})

test("getArtifactChecks warns rather than fails when the signing key is unset", async () => {
  delete process.env.IRONHUB_MANIFEST_SIGNING_KEY
  objectBytes = new TextEncoder().encode("{}")

  const seeded = seedArtifact({
    id: "checks-no-signing-key",
    type: "tool",
    category: "Dev Tools",
    // Content complete (wasm + manifest_toml per design.md D3) so the only
    // thing under test -- the signing-key check -- is isolated from
    // content_complete also failing and dragging publishable down with it.
    content: [{ kind: "wasm" }, { kind: "capabilities" }, { kind: "manifest_toml" }],
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
  const signingCheck = checks.find(
    (check) => check.id === "signing_key_configured"
  )

  assert.equal(signingCheck.status, "warn")
  assert.equal(publishable, true)
})

test("getArtifactChecks never reports capabilities_valid_json as pass when nothing was read", async () => {
  objectBytes = new TextEncoder().encode("{}")

  const seeded = seedArtifact({
    id: "checks-absent-capabilities",
    type: "tool",
    category: "Dev Tools",
    content: [{ kind: "wasm" }],
  })

  const { checks } = await getArtifactChecks("org-1", seeded.id)
  const capCheck = checks.find((check) => check.id === "capabilities_valid_json")

  // A green tick here would claim a file that was never opened.
  assert.equal(capCheck.status, "warn")
  // Absence is already reported by content_complete; it must not double-fail.
  const completeCheck = checks.find((check) => check.id === "content_complete")
  assert.equal(completeCheck.status, "fail")
})

test("getArtifactChecks warns rather than fails when capabilities cannot be read from storage", async () => {
  storageError = new Error("S3 unreachable")
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const seeded = seedArtifact({
      id: "checks-unreadable-capabilities",
      type: "tool",
      category: "Dev Tools",
      // Content complete (wasm + manifest_toml) so the only thing under
      // test -- the storage-read failure -- is isolated from
      // content_complete also failing and dragging publishable down with it.
      content: [{ kind: "wasm" }, { kind: "capabilities" }, { kind: "manifest_toml" }],
    })

    const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
    const capCheck = checks.find(
      (check) => check.id === "capabilities_valid_json"
    )

    // Infrastructure failure must not be reported as corrupt data.
    assert.equal(capCheck.status, "warn")
    assert.match(capCheck.detail, /could not be read/)
    assert.equal(publishable, true)
  } finally {
    console.error = originalConsoleError
    storageError = null
  }
})

// --- cross-organization scoping -------------------------------------------

test("publishPrivateArtifact 404s for an artifact in another organization", async () => {
  const seeded = seedArtifact({
    id: "cross-org-publish",
    content: [{ kind: "wasm" }, { kind: "capabilities" }],
    category: "Dev Tools",
  })
  await assert.rejects(
    () => publishPrivateArtifact("org-2", seeded.id),
    (error) => error instanceof Response && error.status === 404
  )
  assert.equal(artifacts.get(seeded.id).status, "draft")
})

test("unpublishPrivateArtifact 404s for an artifact in another organization", async () => {
  const seeded = seedArtifact({
    id: "cross-org-unpublish",
    content: [{ kind: "wasm" }, { kind: "capabilities" }],
    category: "Dev Tools",
    status: "published",
  })
  await assert.rejects(
    () => unpublishPrivateArtifact("org-2", seeded.id),
    (error) => error instanceof Response && error.status === 404
  )
  assert.equal(artifacts.get(seeded.id).status, "published")
})

test("getArtifactChecks 404s for an artifact in another organization", async () => {
  const seeded = seedArtifact({ id: "cross-org-checks" })
  await assert.rejects(
    () => getArtifactChecks("org-2", seeded.id),
    (error) => error instanceof Response && error.status === 404
  )
})

// --- cleared optional fields ---------------------------------------------

test("an empty category is stored as null rather than an empty string", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "cat-empty", category: "" })
  )
  assert.equal(artifact.category, null)
})

test("patching an empty category clears it instead of storing an empty string", async () => {
  const seeded = seedArtifact({ id: "patch-cat-clear", category: "Dev Tools" })
  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    category: "",
  })
  assert.equal(artifact.category, null)
})

test("an empty sourceUrl is stored as null and skips URL validation", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "repo-empty", sourceUrl: "   " })
  )
  assert.equal(artifact.sourceUrl, null)
})

test("createPrivateArtifact rejects a sourceUrl with embedded credentials", async () => {
  await assert.rejects(
    () =>
      createPrivateArtifact(
        "org-1",
        "user-1",
        baseCreateInput({
          name: "repo-userinfo",
          sourceUrl: "https://totally-real-repo.com@github.com/org/repo",
        })
      ),
    (error) => error instanceof Response && error.status === 400
  )
})

// --- Task 7.2: an entry an agent cannot install blocks the install action ----

test("task 7.2: getArtifactChecks fails agent_contract when a declared asset is not stored", async () => {
  process.env.IRONHUB_MANIFEST_SIGNING_KEY = "dummy-key"
  objectBytes = new TextEncoder().encode("{}")
  // A manifest.toml that declares a schema, against an artifact with no stored
  // assets -- the state every bundle uploaded before assets were persisted is
  // in, and the state a bare `PUT .../content/manifest_toml` creates.
  manifestTomlBytes = new TextEncoder().encode(
    `schema_version = "3"\n\n[[tools]]\nname = "scrape"\ninput_schema_ref = "schemas/scrape.input.v1.json"\n`
  )

  try {
    const seeded = seedArtifact({
      id: "checks-unpublishable-entry",
      type: "tool",
      category: "Dev Tools",
      content: [{ kind: "wasm" }, { kind: "manifest_toml" }],
    })

    const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
    const contractCheck = checks.find((check) => check.id === "agent_contract")

    assert.equal(contractCheck.status, "fail")
    // The reason has to name the path: "this cannot install" without saying
    // what to fix is the failure mode this check exists to replace.
    assert.match(contractCheck.detail, /schemas\/scrape\.input\.v1\.json/)
    assert.equal(publishable, false)
  } finally {
    manifestTomlBytes = new TextEncoder().encode('schema_version = "3"\n')
  }
})

test("task 7.2: agent_contract is not a second voice on missing content", async () => {
  const seeded = seedArtifact({
    id: "checks-incomplete-tool",
    type: "tool",
    category: "Dev Tools",
    content: [{ kind: "wasm" }],
  })

  const { checks } = await getArtifactChecks("org-1", seeded.id)

  // content_complete already names the missing kind. A second row failing for
  // the same reason reads as two problems.
  assert.equal(
    checks.find((check) => check.id === "content_complete").status,
    "fail"
  )
  assert.equal(
    checks.find((check) => check.id === "agent_contract").status,
    "warn"
  )
})
