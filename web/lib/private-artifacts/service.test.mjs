import assert from "node:assert/strict"
import { mock, test } from "node:test"

import { Prisma } from "../prisma/client"

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
          // The real (organizationId, name, version) unique index, since the
          // create path's name-collision handling is driven by P2002.
          const clash = [...artifacts.values()].some(
            (existing) =>
              existing.organizationId === data.organizationId &&
              existing.name === data.name &&
              existing.version === data.version
          )
          if (clash) {
            throw new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              { code: "P2002", clientVersion: "test" }
            )
          }
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
        findMany: async ({ where }) => {
          const prefix = where?.name?.startsWith ?? ""
          return [...artifacts.values()]
            .filter(
              (record) =>
                record.organizationId === where.organizationId &&
                record.name.startsWith(prefix)
            )
            .map((record) => ({ name: record.name }))
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
      // A loadout publishes its members rather than content rows, so the
      // publish path asks for them. No fixture here composes one, and an
      // empty membership is exactly what the loadout publish gate refuses.
      loadoutMember: {
        findMany: async () => loadoutMemberRows,
      },
      privateArtifactContent: {
        delete: async ({ where }) => ({ id: where.id }),
        findFirst: async ({ where }) => {
          const record = artifacts.get(where.artifactId)
          if (
            !record ||
            record.organizationId !== where.artifact.organizationId
          ) {
            return null
          }
          const hasKind = record.content.some((c) => c.kind === where.kind)
          return hasKind
            ? { storageKey: `${where.artifactId}/${where.kind}` }
            : null
        },
      },
    },
  }
}

const { prisma, artifacts } = makeFakeDb()

mock.module("../db", { namedExports: { prisma } })

// The member rows a loadout holds, and what they resolve to. Member health is
// another module's job (loadout-health.ts); what these tests are about is the
// row the manage screen renders from its verdicts.
let loadoutMemberRows = []
let loadoutResolution = []

mock.module("./loadout-health", {
  namedExports: {
    resolveLoadoutMembers: async () => loadoutResolution,
  },
})

function resolvedMember(overrides = {}) {
  return {
    memberId: "member-1",
    source: "private",
    kind: "tool",
    name: "scraper",
    pinnedVersion: null,
    pinnedDigest: null,
    currentVersion: "1.0.0",
    currentDigest: "sha256:aaa",
    status: "ok",
    reason: null,
    blocksInstall: false,
    blocksPublish: false,
    entry: { type: "tool", tool: { name: "scraper", version: "1.0.0" } },
    ...overrides,
  }
}

function agentContractRow(checks) {
  return checks.find((check) => check.id === "agent_contract")
}

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
  assertArtifactContentComplete,
  createPrivateArtifact,
  updatePrivateArtifact,
  publishPrivateArtifact,
  unpublishPrivateArtifact,
  deletePrivateArtifactContentRow,
  getArtifactChecks,
} = await import("./service.ts")

// `assert.rejects` only honours a *synchronous* validator, so reading the
// Response body has to happen outside it.
async function assertResponseRejection(run, status, messagePattern) {
  try {
    await run()
    assert.fail("expected the call to reject")
  } catch (error) {
    assert.ok(error instanceof Response, "rejection must be a Response")
    assert.equal(error.status, status)
    assert.match(await error.text(), messagePattern)
  }
}

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
    publishedVersion: null,
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

// --- name collisions ---------------------------------------------------
//
// Each of these uses a base name of its own: the fake db is shared across
// the whole file, so a test that leaned on the default "my-tool" would see
// the names its neighbours created.

test("createPrivateArtifact suffixes a tool name another artifact already holds", async () => {
  seedArtifact({ name: "usdc-payments", version: "1.0.0" })

  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "usdc-payments", version: "2.0.0" })
  )

  // Not "usdc-payments" at a new version: a name is one item's identity to
  // the agent, so an unrelated item asking for a taken name gets its own.
  assert.equal(artifact.name, "usdc-payments-2")
})

test("createPrivateArtifact suffixes a skill name the same way", async () => {
  seedArtifact({ type: "skill", name: "invoice-auditor" })

  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({
      type: "skill",
      name: "invoice-auditor",
      title: "Invoice Auditor",
    })
  )

  assert.equal(artifact.name, "invoice-auditor-2")
})

test("createPrivateArtifact walks past suffixes that are themselves taken", async () => {
  seedArtifact({ name: "csv-cleaner" })
  seedArtifact({ name: "csv-cleaner-2" })
  seedArtifact({ name: "csv-cleaner-3" })

  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "csv-cleaner" })
  )

  assert.equal(artifact.name, "csv-cleaner-4")
})

test("createPrivateArtifact keeps the requested name when nothing holds it", async () => {
  seedArtifact({ name: "report-generator" })

  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "report-gen" })
  )

  // "report-generator" starts with "report-gen" but is neither "report-gen"
  // nor "report-gen-<n>", so it must not push the new artifact to a suffix.
  assert.equal(artifact.name, "report-gen")
})

test("createPrivateArtifact ignores names held by another organization", async () => {
  seedArtifact({ name: "shared-name", organizationId: "org-2" })

  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({ name: "shared-name" })
  )

  assert.equal(artifact.name, "shared-name")
})

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

test("task 3.4: publishing a loadout with no members is refused, and it stays a draft", async () => {
  // The loadout branch replaces the content-completeness gate rather than
  // sitting beside it: a loadout stores no content, so "missing required
  // content" would be the wrong sentence for the wrong problem.
  const seeded = seedArtifact({
    id: "pub-empty-loadout",
    type: "loadout",
    name: "a-trader",
    content: [],
    category: "Dev Tools",
  })
  await assertResponseRejection(
    () => publishPrivateArtifact("org-1", seeded.id),
    409,
    /at least one member/
  )
  assert.equal(artifacts.get(seeded.id).status, "draft")
})

// --- the readiness panel for a loadout ----------------------------------
//
// The bug these guard: the agent-contract row asked for the single entry a
// loadout does not have, and rendered "Unsupported artifact type: loadout"
// directly beneath an install panel correctly saying the hub knows what a
// loadout is and is waiting on the agent. One screen, two contradictory
// claims.

test("the readiness row for an empty loadout says it has no members, not that its type is unsupported", async () => {
  loadoutMemberRows = []
  loadoutResolution = []
  const seeded = seedArtifact({
    id: "checks-empty-loadout",
    type: "loadout",
    name: "checks-empty",
    content: [],
    category: "Dev Tools",
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
  const row = agentContractRow(checks)

  assert.equal(row.status, "fail")
  assert.match(row.detail, /must have at least one member/)
  assert.doesNotMatch(row.detail, /Unsupported artifact type/)
  assert.equal(publishable, false)
})

test("the readiness row for a loadout names every failing member, the way the publish refusal does", async () => {
  loadoutMemberRows = [{ id: "member-1" }, { id: "member-2" }]
  loadoutResolution = [
    resolvedMember({
      memberId: "member-1",
      status: "draft",
      reason: "tool scraper is still a draft",
      blocksPublish: true,
    }),
    resolvedMember({
      memberId: "member-2",
      status: "missing",
      reason: "skill summarise cannot be resolved",
      blocksPublish: true,
    }),
  ]
  const seeded = seedArtifact({
    id: "checks-broken-loadout",
    type: "loadout",
    name: "checks-broken",
    content: [],
    category: "Dev Tools",
  })

  const row = agentContractRow((await getArtifactChecks("org-1", seeded.id)).checks)

  assert.equal(row.status, "fail")
  // One row, several reasons -- the shape the row has always had.
  assert.match(row.detail, /scraper is still a draft/)
  assert.match(row.detail, /summarise cannot be resolved/)
  // The gate's "Loadout cannot be published:" framing is redundant under a row
  // already labelled "Installable by an agent".
  assert.doesNotMatch(row.detail, /cannot be published/)
})

test("a loadout whose members all resolve passes the readiness row", async () => {
  loadoutMemberRows = [{ id: "member-1" }]
  loadoutResolution = [resolvedMember()]
  const seeded = seedArtifact({
    id: "checks-healthy-loadout",
    type: "loadout",
    name: "checks-healthy",
    content: [],
    category: "Dev Tools",
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
  const row = agentContractRow(checks)

  assert.equal(row.status, "pass")
  assert.match(row.detail, /Every member resolves/)
  assert.equal(publishable, true)
})

test("a loadout is not asked for a repository link, while a tool still is", async () => {
  loadoutMemberRows = [{ id: "member-1" }]
  loadoutResolution = [resolvedMember()]
  const loadout = seedArtifact({
    id: "checks-repo-loadout",
    type: "loadout",
    name: "checks-repo",
    content: [],
    category: "Dev Tools",
  })
  const tool = seedArtifact({
    id: "checks-repo-tool",
    content: [{ kind: "wasm" }, { kind: "manifest_toml" }],
    category: "Dev Tools",
  })

  const loadoutChecks = (await getArtifactChecks("org-1", loadout.id)).checks
  const toolChecks = (await getArtifactChecks("org-1", tool.id)).checks

  // Omitted, not passed: a pass would claim a repository link the loadout does
  // not have and cannot meaningfully have.
  assert.equal(
    loadoutChecks.some((check) => check.id === "repo_link_set"),
    false
  )
  assert.equal(
    toolChecks.some((check) => check.id === "repo_link_set"),
    true
  )
})

test("task 7.8: the install-link gate refuses a loadout as unavailable rather than as an unknown type", async () => {
  const seeded = seedArtifact({
    id: "install-loadout",
    type: "loadout",
    name: "a-trader-install",
    content: [],
    category: "Dev Tools",
  })

  // The refusal itself is correct -- delivery is blocked on the agent's
  // multi-entry payload. Only the wording was wrong: "unsupported artifact
  // type" says the hub does not know what a loadout is, which would be filed
  // as a defect against the hub.
  await assertResponseRejection(
    () => assertArtifactContentComplete("org-1", seeded.id),
    409,
    /not available yet/
  )

  try {
    await assertArtifactContentComplete("org-1", seeded.id)
    assert.fail("expected the call to reject")
  } catch (error) {
    const message = await error.text()
    assert.doesNotMatch(message, /Unsupported artifact type/)
    // Says the same thing the loadout editor says, so the API and the screen
    // do not contradict each other.
    assert.match(message, /multi-entry install payload/)
  }
})

test("the install-link gate still reports a genuinely unknown type as unsupported", async () => {
  const seeded = seedArtifact({
    id: "install-unknown",
    type: "sculpture",
    name: "not-a-real-type",
    content: [],
  })

  await assertResponseRejection(
    () => assertArtifactContentComplete("org-1", seeded.id),
    409,
    /Unsupported artifact type: sculpture/
  )
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

test("getArtifactChecks says nothing about a capabilities document", async () => {
  // Removed deliberately: *.capabilities.json is the legacy carrier of data
  // manifest.toml owns under reborn.extension_manifest.v3, the agent files it
  // under `legacy/capabilities.json` and never reads it, and no workspace
  // surface offers to add or fix one -- so a row about it could only tell an
  // owner to act on a file they cannot see. Even stored bytes that do not
  // parse produce no check.
  objectBytes = new TextEncoder().encode("not json")

  const seeded = seedArtifact({
    id: "checks-corrupt-capabilities",
    type: "tool",
    category: "Dev Tools",
    content: [
      { kind: "wasm" },
      { kind: "manifest_toml" },
      { kind: "capabilities" },
    ],
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)

  assert.equal(
    checks.find((check) => check.id === "capabilities_valid_json"),
    undefined
  )
  assert.ok(checks.every((check) => !/capabilit/i.test(check.label)))
  assert.equal(publishable, true)
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
    content: [
      { kind: "wasm" },
      { kind: "capabilities" },
      { kind: "manifest_toml" },
    ],
  })

  const { checks, publishable } = await getArtifactChecks("org-1", seeded.id)
  const signingCheck = checks.find(
    (check) => check.id === "signing_key_configured"
  )

  assert.equal(signingCheck.status, "warn")
  assert.equal(publishable, true)
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

// --- version is mutable, and only ever moves forward --------------------

test("updatePrivateArtifact accepts a version bump", async () => {
  const seeded = seedArtifact({ id: "ver-bump", version: "1.2.0" })

  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    version: "1.3.0",
  })

  assert.equal(artifact.version, "1.3.0")
  assert.equal(artifacts.get(seeded.id).version, "1.3.0")
})

test("updatePrivateArtifact rejects a version outside the creation grammar", async () => {
  const seeded = seedArtifact({ id: "ver-grammar", version: "1.0.0" })

  await assertResponseRejection(
    () => updatePrivateArtifact("org-1", seeded.id, { version: "1.0.0 beta" }),
    400,
    /version must be 1-64 characters/
  )
  assert.equal(artifacts.get(seeded.id).version, "1.0.0")
})

test("updatePrivateArtifact rejects an empty version", async () => {
  const seeded = seedArtifact({ id: "ver-empty", version: "1.0.0" })

  await assertResponseRejection(
    () => updatePrivateArtifact("org-1", seeded.id, { version: "" }),
    400,
    /version must be 1-64 characters/
  )
})

test("updatePrivateArtifact rejects resubmitting the current version", async () => {
  const seeded = seedArtifact({ id: "ver-same", version: "2.1.0" })

  await assertResponseRejection(
    () => updatePrivateArtifact("org-1", seeded.id, { version: "2.1.0" }),
    400,
    /version is already 2\.1\.0/
  )
})

test("updatePrivateArtifact rejects a semver downgrade, naming both versions", async () => {
  const seeded = seedArtifact({ id: "ver-down", version: "1.3.0" })

  await assertResponseRejection(
    () => updatePrivateArtifact("org-1", seeded.id, { version: "1.2.0" }),
    400,
    /version 1\.2\.0 is not greater than the current version 1\.3\.0/
  )
  assert.equal(artifacts.get(seeded.id).version, "1.3.0")
})

test("updatePrivateArtifact rejects a prerelease that ranks below its own release", async () => {
  const seeded = seedArtifact({ id: "ver-prerelease", version: "1.1.0" })

  // Semver 2.0.0: a prerelease ranks below the release sharing its core, so
  // this is a downgrade even though the string looks like it grew.
  await assertResponseRejection(
    () => updatePrivateArtifact("org-1", seeded.id, { version: "1.1.0-rc.1" }),
    400,
    /is not greater than/
  )
})

test("updatePrivateArtifact accepts a prerelease bump ordered numerically", async () => {
  const seeded = seedArtifact({ id: "ver-rc", version: "2.0.0-rc.9" })

  // `rc.10` sorts below `rc.9` as text; semver compares numeric identifiers
  // as numbers, so this is the bump it looks like.
  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    version: "2.0.0-rc.10",
  })

  assert.equal(artifact.version, "2.0.0-rc.10")
})

test("updatePrivateArtifact rejects a change that only moves build metadata", async () => {
  const seeded = seedArtifact({ id: "ver-build", version: "1.0.0+alpha" })

  // The strings differ, so the inequality check passes -- but semver excludes
  // build metadata from precedence, so nothing about the version has moved.
  await assertResponseRejection(
    () => updatePrivateArtifact("org-1", seeded.id, { version: "1.0.0+beta" }),
    400,
    /is not greater than/
  )
})

test("updatePrivateArtifact compares non-semver versions on inequality alone", async () => {
  const seeded = seedArtifact({ id: "ver-datey", version: "2024-06-release" })

  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    version: "2024-07-release",
  })

  assert.equal(artifact.version, "2024-07-release")
})

test("updatePrivateArtifact skips the ordering check when only one side is semver", async () => {
  const seeded = seedArtifact({ id: "ver-mixed", version: "nightly" })

  // Nothing orders "nightly" against "0.0.1", so demanding an increase here
  // would only make the artifact unbumpable.
  const artifact = await updatePrivateArtifact("org-1", seeded.id, {
    version: "0.0.1",
  })

  assert.equal(artifact.version, "0.0.1")
})

test("updatePrivateArtifact refuses a version bump from another organization", async () => {
  const seeded = seedArtifact({ id: "ver-cross-org", version: "1.0.0" })

  await assert.rejects(
    () => updatePrivateArtifact("org-2", seeded.id, { version: "2.0.0" }),
    (error) => error instanceof Response && error.status === 404
  )
  assert.equal(artifacts.get(seeded.id).version, "1.0.0")
})

test("a bump does not create a second row for the same name", async () => {
  const seeded = seedArtifact({ id: "ver-one-row", name: "one-row-only" })
  const before = artifacts.size

  await updatePrivateArtifact("org-1", seeded.id, { version: "9.9.9" })

  assert.equal(artifacts.size, before)
  assert.equal(
    [...artifacts.values()].filter(
      (record) =>
        record.organizationId === "org-1" && record.name === "one-row-only"
    ).length,
    1
  )
})

// --- the published-content freeze ---------------------------------------

test("publishPrivateArtifact records the version it published", async () => {
  const seeded = seedArtifact({
    id: "freeze-publish",
    type: "skill",
    content: [{ kind: "skill_md" }],
    category: "Dev Tools",
    version: "1.0.0",
  })

  const artifact = await publishPrivateArtifact("org-1", seeded.id)

  assert.equal(artifact.status, "published")
  assert.equal(artifact.publishedVersion, "1.0.0")
})

test("unpublishPrivateArtifact clears the recorded version", async () => {
  const seeded = seedArtifact({
    id: "freeze-unpublish",
    type: "skill",
    status: "published",
    publishedVersion: "1.0.0",
  })

  const artifact = await unpublishPrivateArtifact("org-1", seeded.id)

  assert.equal(artifact.status, "draft")
  assert.equal(artifact.publishedVersion, null)
})

test("deletePrivateArtifactContentRow is refused on a published artifact at its published version", async () => {
  const seeded = seedArtifact({
    id: "freeze-delete-row",
    status: "published",
    version: "1.0.0",
    publishedVersion: "1.0.0",
    content: [{ kind: "wasm" }],
  })

  await assertResponseRejection(
    () => deletePrivateArtifactContentRow("org-1", seeded.id, "wasm"),
    409,
    /Change the version before changing its files/
  )
})

test("deletePrivateArtifactContentRow is allowed once the version has moved", async () => {
  const seeded = seedArtifact({
    id: "freeze-delete-row-bumped",
    status: "published",
    version: "1.1.0",
    publishedVersion: "1.0.0",
    content: [{ kind: "wasm" }],
  })

  await deletePrivateArtifactContentRow("org-1", seeded.id, "wasm")
})

test("a bump on a published artifact releases the freeze without unpublishing it", async () => {
  const seeded = seedArtifact({
    id: "freeze-bump-releases",
    status: "published",
    version: "1.0.0",
    publishedVersion: "1.0.0",
    content: [{ kind: "wasm" }],
  })

  await updatePrivateArtifact("org-1", seeded.id, { version: "1.0.1" })

  // Still published -- the freeze is about which bytes a version names, not
  // about taking the artifact off the shelf.
  assert.equal(artifacts.get(seeded.id).status, "published")
  await deletePrivateArtifactContentRow("org-1", seeded.id, "wasm")
})

// --- Soul visibility --------------------------------------------------------
//
// A soul's text becomes the opening of the agent's system prompt, ahead of
// memory and tools, so it is the one artifact type the agent does not
// sandbox. The refusal lives in the service and not in the form because it is
// a security property: an API client never sees the form.

test("createPrivateArtifact accepts a public soul", async () => {
  const soul = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({
      type: "soul",
      name: "public-soul",
      title: "Public Soul",
      visibility: "public",
    })
  )

  // Souls are shareable like every other type. What sets them apart is not
  // who may see one but what installing one does -- the text is read as the
  // opening of the installer's system prompt -- and that is answered by
  // disclosing the document before an install, not by withholding the type.
  assert.equal(soul.visibility, "public")
})

test("createPrivateArtifact accepts a soul with no visibility, defaulting to private", async () => {
  const artifact = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({
      type: "soul",
      name: "careful-analyst",
      title: "Careful Analyst",
    })
  )

  assert.equal(artifact.type, "soul")
  assert.equal(artifact.visibility, "private")
})

test("updatePrivateArtifact lets a soul be turned public", async () => {
  const soul = seedArtifact({
    id: "soul-visibility",
    type: "soul",
    name: "steady-hand",
    visibility: "private",
  })

  await updatePrivateArtifact("org-1", soul.id, { visibility: "public" })

  assert.equal(artifacts.get(soul.id).visibility, "public")
})

test("updatePrivateArtifact still lets a soul be set back to private", async () => {
  const soul = seedArtifact({
    id: "soul-visibility-private",
    type: "soul",
    name: "steady-hand-2",
    visibility: "private",
  })

  const updated = await updatePrivateArtifact("org-1", soul.id, {
    visibility: "private",
  })

  assert.equal(updated.visibility, "private")
})

test("skills and tools are unaffected by the soul visibility rule", async () => {
  const skill = seedArtifact({
    id: "skill-visibility",
    type: "skill",
    name: "public-able-skill",
    visibility: "private",
  })
  const tool = seedArtifact({
    id: "tool-visibility",
    type: "tool",
    name: "public-able-tool",
    visibility: "private",
  })

  assert.equal(
    (await updatePrivateArtifact("org-1", skill.id, { visibility: "public" }))
      .visibility,
    "public"
  )
  assert.equal(
    (await updatePrivateArtifact("org-1", tool.id, { visibility: "public" }))
      .visibility,
    "public"
  )

  const created = await createPrivateArtifact(
    "org-1",
    "user-1",
    baseCreateInput({
      type: "skill",
      name: "public-request-skill",
      title: "Public Request Skill",
      visibility: "public",
    })
  )
  assert.equal(created.visibility, "public")
})

test("createPrivateArtifact rejects a type outside the supported list", async () => {
  await assertResponseRejection(
    () =>
      createPrivateArtifact(
        "org-1",
        "user-1",
        // A word the hub will never accept as a type. An artifact type that
        // is merely unsupported today is the wrong stand-in here: this test
        // would then pass for as long as it takes somebody to support it.
        baseCreateInput({ type: "widget", name: "not-a-type" })
      ),
    400,
    /Invalid type: widget/
  )
})

// --- Soul publish preconditions --------------------------------------------

test("publishPrivateArtifact is blocked for a soul with no document", async () => {
  const soul = seedArtifact({
    id: "soul-publish-missing",
    type: "soul",
    name: "unwritten-soul",
    category: "Productivity",
    content: [],
  })

  await assertResponseRejection(
    () => publishPrivateArtifact("org-1", soul.id),
    409,
    /soul_md/
  )
})

test("publishPrivateArtifact does not require a readme", async () => {
  const soul = seedArtifact({
    id: "soul-publish-ready",
    type: "soul",
    name: "written-soul",
    category: "Productivity",
    content: [{ kind: "soul_md" }],
  })

  const published = await publishPrivateArtifact("org-1", soul.id)

  assert.equal(published.status, "published")
  assert.equal(published.publishedVersion, "1.0.0")
})

test("getArtifactChecks reports soul_md_present and says nothing about a readme", async () => {
  const soul = seedArtifact({
    id: "soul-checks",
    type: "soul",
    name: "checked-soul",
    category: "Productivity",
    content: [{ kind: "soul_md" }],
  })

  const { checks } = await getArtifactChecks("org-1", soul.id)
  const ids = checks.map((check) => check.id)

  assert.ok(ids.includes("soul_md_present"))
  assert.equal(
    checks.find((check) => check.id === "soul_md_present").status,
    "pass"
  )
  // The readme is optional and never published, so a row about it would be a
  // row nobody can fail.
  assert.equal(
    checks.some((check) => check.id.includes("readme")),
    false
  )
  assert.equal(
    checks.some((check) => check.id === "skill_md_present"),
    false
  )
})
