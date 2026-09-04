import assert from "node:assert/strict"
import { mock, test } from "node:test"

import {
  skillEntryArtifactDigest,
  soulArtifactDigest,
  toolEntryArtifactDigest,
} from "@/lib/catalog/ironclaw-contract"
import { createIliadSkillSlug } from "@/lib/iliad/public-skills-utils"

// One store for both loadouts and the artifacts their private members point
// at: the module addresses them through the same table and the same
// organization scope, so splitting them in the fixture would let a test pass
// against a lookup the real query could not perform.
let rows = new Map()
let entries = new Map()
let upstream = null
let upstreamFetches = 0
let artifactUpdates = []
let entryBuildInputs = []

mock.module("../db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        findFirst: async ({ where }) => {
          for (const row of rows.values()) {
            if (
              where.organizationId !== undefined &&
              row.organizationId !== where.organizationId
            ) {
              continue
            }
            if (where.id !== undefined) {
              if (row.id === where.id) return row
              continue
            }
            if (row.type === where.type && row.name === where.name) return row
          }
          return null
        },
        findMany: async ({ where }) => {
          const wantsPublicMember = where?.members?.some?.source === "public"
          return Array.from(rows.values()).filter((row) => {
            if (where?.type && row.type !== where.type) return false
            if (where?.status && row.status !== where.status) return false
            if (
              wantsPublicMember &&
              !(row.members ?? []).some((member) => member.source === "public")
            ) {
              return false
            }
            return true
          })
        },
        update: async ({ where, data }) => {
          artifactUpdates.push({ where, data })
          const row = rows.get(where.id)
          Object.assign(row, data)
          return row
        },
      },
      $transaction: async (operations) => Promise.all(operations),
    },
  },
})

mock.module("./manifest", {
  namedExports: {
    buildPrivateArtifactEntry: async (input) => {
      entryBuildInputs.push(input)
      const { artifactId } = input
      const entry = entries.get(artifactId)
      if (!entry) {
        // The shape the real builder throws for an artifact that exists but
        // cannot be published as it stands (409, per manifest.ts).
        throw new Response("Artifact is missing required content: wasm", {
          status: 409,
        })
      }
      return entry
    },
  },
})

mock.module("@/lib/catalog/manifest.server", {
  namedExports: {
    buildUnifiedManifest: async () => {
      upstreamFetches += 1
      if (upstream instanceof Error) throw upstream
      return upstream
    },
  },
})

const {
  assertLoadoutInstallable,
  getLoadoutVerificationRecord,
  resolveLoadoutEntries,
  resolveLoadoutForInstall,
  markLoadoutStale,
  pollUpstreamRelease,
  readLoadoutHealth,
  resolveLoadoutMembers,
} = await import("./loadout-health.ts")

const ORG = "org-1"
/** Fixed so a test can prove a state write did not move it. */
const UPDATED_AT = new Date("2026-01-01T00:00:00.000Z")

/**
 * `assert.rejects` takes a synchronous validator, and every refusal in this
 * module is a `Response` whose body must be awaited to be asserted on. So the
 * rejection is captured and inspected instead.
 */
async function rejection(promise) {
  try {
    await promise
  } catch (error) {
    return error
  }
  assert.fail("expected the call to be refused")
}

function reset() {
  rows = new Map()
  entries = new Map()
  upstream = {
    version: "1",
    release_tag: "v9",
    repo: "r",
    tools: [],
    skills: [],
  }
  upstreamFetches = 0
  artifactUpdates = []
  entryBuildInputs = []
}

function artifact(overrides) {
  const row = {
    organizationId: ORG,
    status: "published",
    visibility: "private",
    version: "1.0.0",
    verifiedReleaseTag: null,
    needsReverification: false,
    updatedAt: UPDATED_AT,
    members: [],
    ...overrides,
  }
  rows.set(row.id, row)
  return row
}

function loadout(members, overrides = {}) {
  return artifact({
    id: "loadout-1",
    type: "loadout",
    name: "trader",
    ...overrides,
    members: members.map((member, index) => ({
      id: `member-${index}`,
      loadoutId: "loadout-1",
      version: null,
      artifactId: null,
      pinnedDigest: null,
      ...member,
    })),
  })
}

function toolEntry(artifactId, name, sha, version = "1.0.0") {
  return {
    type: "tool",
    artifactId,
    tool: {
      name,
      crate_name: name,
      version,
      description: "",
      provenance: "private",
      wasm: { url: "https://x/w", size_bytes: 1, sha256: `wasm-${sha}` },
      capabilities: { url: "https://x/c", size_bytes: 2, sha256: `cap-${sha}` },
    },
  }
}

function documentEntry(type, artifactId, name, sha, version = "1.0.0") {
  return {
    type,
    artifactId,
    skill: {
      name,
      trunk: name,
      version,
      description: "",
      provenance: "private",
      skill_md: { url: "https://x/s", size_bytes: 3, sha256: `doc-${sha}` },
    },
  }
}

function publicTool(name, sha, version = "2.0.0") {
  return {
    name,
    crate_name: name,
    version,
    description: "",
    provenance: "official",
    wasm: { url: "https://x/w", size_bytes: 1, sha256: `wasm-${sha}` },
    capabilities: { url: "https://x/c", size_bytes: 2, sha256: `cap-${sha}` },
  }
}

function publicSkill(name, sha, version = "2.0.0") {
  return {
    name,
    trunk: name,
    version,
    description: "",
    provenance: "official",
    skill_md: { url: "https://x/s", size_bytes: 3, sha256: `doc-${sha}` },
  }
}

const resolve = (overrides = {}) =>
  resolveLoadoutMembers({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
    ...overrides,
  })

// --- Resolution (5.1) ------------------------------------------------------

test("resolves a private member from storage and a public member from the catalog, ordered by kind then name", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  const entry = toolEntry("art-tool", "firecrawl", "a")
  entries.set("art-tool", entry)
  upstream.skills = [publicSkill("research", "b")]

  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
      version: "1.0.0",
      pinnedDigest: toolEntryArtifactDigest(entry.tool),
    },
    {
      source: "public",
      kind: "skill",
      name: "research",
      version: "2.0.0",
      pinnedDigest: skillEntryArtifactDigest(publicSkill("research", "b")),
    },
  ])

  const members = await resolve()

  assert.deepEqual(
    members.map((member) => `${member.kind}:${member.name}`),
    ["skill:research", "tool:firecrawl"]
  )
  assert.deepEqual(
    members.map((member) => member.status),
    ["ok", "ok"]
  )
  assert.deepEqual(
    members.map((member) => member.reason),
    [null, null]
  )
  assert.ok(members.every((member) => !member.blocksInstall))
  assert.ok(members.every((member) => !member.blocksPublish))
  assert.equal(members[1].currentVersion, "1.0.0")
})

test("a private soul member is digested with the soul formula", async () => {
  reset()
  artifact({ id: "art-soul", type: "soul", name: "trader" })
  const entry = documentEntry("soul", "art-soul", "trader", "s")
  entries.set("art-soul", entry)

  loadout([
    {
      source: "private",
      kind: "soul",
      name: "trader",
      artifactId: "art-soul",
      pinnedDigest: soulArtifactDigest(entry.skill.skill_md.sha256),
    },
  ])

  const [member] = await resolve()
  assert.equal(member.status, "ok")
  assert.equal(member.currentDigest, soulArtifactDigest("doc-s"))
})

// --- Removed vs unreachable (5.2) ------------------------------------------

test("a public member removed upstream reads as a removal, not as unavailability", async () => {
  reset()
  upstream.tools = []
  loadout([
    {
      source: "public",
      kind: "tool",
      name: "firecrawl",
      pinnedDigest: "sha256:whatever",
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "missing")
  assert.match(member.reason, /Public tool "firecrawl"/)
  assert.match(member.reason, /removed upstream/)
  assert.ok(!/unreachable/.test(member.reason))
  assert.equal(member.blocksInstall, true)
  assert.equal(member.blocksPublish, true)
})

test("an unreachable upstream reads as unavailability, not as a removal", async () => {
  reset()
  upstream = new Error("Official manifest request failed with 503.")
  loadout([
    {
      source: "public",
      kind: "tool",
      name: "firecrawl",
      pinnedDigest: "sha256:whatever",
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "unreachable")
  assert.match(member.reason, /Public tool "firecrawl"/)
  assert.match(member.reason, /unreachable/)
  assert.match(member.reason, /not a removal/)
  assert.equal(member.blocksInstall, true)
})

test("a private member whose artifact is gone is reported missing, naming it", async () => {
  reset()
  loadout([
    {
      source: "private",
      kind: "skill",
      name: "notes",
      artifactId: "art-gone",
      pinnedDigest: "sha256:whatever",
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "missing")
  assert.match(
    member.reason,
    /Private skill "notes" is no longer in this organization/
  )
  assert.equal(member.blocksInstall, true)
})

test("a private member that cannot be built into an entry is unresolvable, naming the builder's reason", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
      pinnedDigest: "sha256:whatever",
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "missing")
  assert.match(member.reason, /Private tool "firecrawl" cannot be resolved/)
  assert.match(member.reason, /missing required content: wasm/)
  assert.equal(member.blocksInstall, true)
})

// --- Drift by source (5.3, and test 8.3) -----------------------------------

test("a drifted private member blocks installs but not the publish that repairs it", async () => {
  reset()
  artifact({
    id: "art-tool",
    type: "tool",
    name: "firecrawl",
    version: "1.1.0",
  })
  entries.set("art-tool", toolEntry("art-tool", "firecrawl", "new", "1.1.0"))

  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
      version: "1.0.0",
      pinnedDigest: toolEntryArtifactDigest(
        toolEntry("x", "firecrawl", "old").tool
      ),
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "drifted")
  assert.equal(member.blocksInstall, true)
  // Publishing re-records every member's pins, so it is the repair for drift.
  // Blocking it here would refuse the only action that clears the condition.
  assert.equal(member.blocksPublish, false)
  assert.equal(member.pinnedVersion, "1.0.0")
  assert.equal(member.currentVersion, "1.1.0")
  assert.notEqual(member.currentDigest, member.pinnedDigest)
  assert.match(member.reason, /Private tool "firecrawl" has changed/)

  const refusal = await rejection(
    assertLoadoutInstallable({
      loadoutId: "loadout-1",
      organizationId: ORG,
      loadoutVisibility: "private",
    })
  )
  assert.ok(refusal instanceof Response)
  assert.equal(refusal.status, 409)
  const body = await refusal.text()
  assert.match(body, /Loadout cannot be installed/)
  assert.match(body, /Private tool "firecrawl" has changed/)
})

test("a public member updated upstream is reported but never blocks an install", async () => {
  reset()
  upstream.tools = [publicTool("firecrawl", "new")]
  loadout([
    {
      source: "public",
      kind: "tool",
      name: "firecrawl",
      version: "2.0.0",
      pinnedDigest: toolEntryArtifactDigest(publicTool("firecrawl", "old")),
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "updated_upstream")
  assert.equal(member.blocksInstall, false)
  assert.equal(member.blocksPublish, false)
  assert.notEqual(member.currentDigest, member.pinnedDigest)
  assert.match(member.reason, /Public tool "firecrawl" was updated upstream/)

  const members = await assertLoadoutInstallable({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })
  assert.equal(members.length, 1)
})

test("an install is refused naming a public member that no longer exists upstream", async () => {
  reset()
  upstream.tools = []
  loadout([
    {
      source: "public",
      kind: "tool",
      name: "firecrawl",
      pinnedDigest: "sha256:x",
    },
  ])

  const refusal = await rejection(
    assertLoadoutInstallable({
      loadoutId: "loadout-1",
      organizationId: ORG,
      loadoutVisibility: "private",
    })
  )
  assert.equal(refusal.status, 409)
  assert.match(
    await refusal.text(),
    /Public tool "firecrawl" is no longer published/
  )
})

test("a draft member blocks publication but not, on its own, an install", async () => {
  reset()
  artifact({ id: "art-skill", type: "skill", name: "notes", status: "draft" })
  const entry = documentEntry("skill", "art-skill", "notes", "d")
  entries.set("art-skill", entry)

  loadout([
    {
      source: "private",
      kind: "skill",
      name: "notes",
      artifactId: "art-skill",
      pinnedDigest: skillEntryArtifactDigest(entry.skill),
    },
  ])

  const [member] = await resolve()

  assert.equal(member.status, "draft")
  assert.equal(member.blocksPublish, true)
  assert.equal(member.blocksInstall, false)
  assert.match(member.reason, /Private skill "notes" is still a draft/)
})

test("a private member inside a public loadout is too narrow and blocks both gates", async () => {
  reset()
  artifact({
    id: "art-skill",
    type: "skill",
    name: "notes",
    visibility: "private",
  })
  const entry = documentEntry("skill", "art-skill", "notes", "d")
  entries.set("art-skill", entry)

  loadout(
    [
      {
        source: "private",
        kind: "skill",
        name: "notes",
        artifactId: "art-skill",
        pinnedDigest: skillEntryArtifactDigest(entry.skill),
      },
    ],
    { visibility: "public" }
  )

  const [member] = await resolve({ loadoutVisibility: "public" })

  assert.equal(member.status, "visibility_too_narrow")
  assert.equal(member.blocksPublish, true)
  assert.equal(member.blocksInstall, true)
  assert.match(member.reason, /Private skill "notes" is private/)
})

// --- Release identifier, marking, and lazy re-verification (5.4 - 5.7) -----

test("a poll marks a loadout holding public members and leaves a private-only loadout alone", async () => {
  reset()
  artifact({ id: "art-skill", type: "skill", name: "notes" })
  entries.set("art-skill", documentEntry("skill", "art-skill", "notes", "d"))
  upstream.skills = [publicSkill("research", "b")]

  loadout([
    { source: "public", kind: "skill", name: "research", pinnedDigest: null },
  ])
  artifact({
    id: "loadout-2",
    type: "loadout",
    name: "private-only",
    members: [
      {
        id: "member-p",
        loadoutId: "loadout-2",
        source: "private",
        kind: "skill",
        name: "notes",
        artifactId: "art-skill",
        version: null,
        pinnedDigest: null,
      },
    ],
  })

  // Verified against v9, so the same tag must not mark it.
  await resolve()
  let poll = await pollUpstreamRelease()
  assert.equal(poll.releaseTag, "v9")
  assert.deepEqual(poll.markedLoadoutIds, [])
  assert.equal(rows.get("loadout-1").needsReverification, false)

  upstream.release_tag = "v10"
  poll = await pollUpstreamRelease()

  assert.equal(poll.releaseTag, "v10")
  assert.deepEqual(poll.markedLoadoutIds, ["loadout-1"])
  // Durable, because the process that polls is not the process that reads.
  assert.equal(rows.get("loadout-1").needsReverification, true)
  // The private-only loadout is not in the query's result at all, so it can
  // neither be reported nor written.
  assert.equal(rows.get("loadout-2").needsReverification, false)

  // Polling again re-reports it -- it still needs re-verification against v10
  // -- but does not write the same value a second time.
  const writesBefore = artifactUpdates.length
  poll = await pollUpstreamRelease()
  assert.deepEqual(poll.markedLoadoutIds, ["loadout-1"])
  assert.equal(artifactUpdates.length, writesBefore)
})

test("a poll against an unreachable upstream marks nothing", async () => {
  reset()
  loadout([{ source: "public", kind: "skill", name: "research" }])
  upstream = new Error("socket hang up")

  const poll = await pollUpstreamRelease()

  assert.equal(poll.unreachable, true)
  assert.equal(poll.releaseTag, null)
  assert.deepEqual(poll.markedLoadoutIds, [])
})

test("every read verifies, and a read reports and clears a durable mark", async () => {
  reset()
  upstream.skills = [publicSkill("research", "b")]
  loadout([{ source: "public", kind: "skill", name: "research" }])

  const first = await readLoadoutHealth({
    loadoutId: "loadout-1",
    organizationId: ORG,
  })
  assert.equal(first.wasStale, false)
  assert.equal(first.releaseTag, "v9")
  assert.equal(first.installable, true)
  assert.equal(upstreamFetches, 1)

  // Nothing is cached across processes any more, so a second read verifies
  // again rather than serving a remembered answer.
  const second = await readLoadoutHealth({
    loadoutId: "loadout-1",
    organizationId: ORG,
  })
  assert.equal(second.wasStale, false)
  assert.equal(upstreamFetches, 2)

  await assertLoadoutInstallable({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })
  assert.equal(upstreamFetches, 3)

  // A mark written by another process -- the poller -- is what the read sees.
  await markLoadoutStale("loadout-1")
  assert.equal(rows.get("loadout-1").needsReverification, true)

  const third = await readLoadoutHealth({
    loadoutId: "loadout-1",
    organizationId: ORG,
  })
  assert.equal(third.wasStale, true)
  // And the re-verification it provoked clears it.
  assert.equal(rows.get("loadout-1").needsReverification, false)
})

test("a resolution records the release it verified against, and writes nothing when that is unchanged", async () => {
  reset()
  upstream.skills = [publicSkill("research", "b")]
  loadout([{ source: "public", kind: "skill", name: "research" }])

  await resolve()
  assert.deepEqual(await getLoadoutVerificationRecord("loadout-1"), {
    loadoutId: "loadout-1",
    verifiedReleaseTag: "v9",
    needsReverification: false,
  })
  assert.equal(artifactUpdates.length, 1)

  // A second resolution agrees with the row, so it has nothing to record --
  // otherwise every page view of a healthy loadout would be a write.
  await resolve()
  assert.equal(artifactUpdates.length, 1)

  upstream.release_tag = "v10"
  await resolve()
  assert.equal(artifactUpdates.length, 2)
  assert.equal(rows.get("loadout-1").verifiedReleaseTag, "v10")
})

test("neither state write moves updatedAt", async () => {
  reset()
  upstream.skills = [publicSkill("research", "b")]
  loadout([{ source: "public", kind: "skill", name: "research" }])

  await resolve()
  await markLoadoutStale("loadout-1")
  await pollUpstreamRelease()

  assert.ok(artifactUpdates.length > 0)
  // Every write carries the row's own timestamp forward: an upstream release
  // must not reorder the owner's workspace list.
  for (const update of artifactUpdates) {
    assert.equal(update.data.updatedAt, UPDATED_AT)
  }
  assert.equal(rows.get("loadout-1").updatedAt, UPDATED_AT)
})

test("a loadout that was never verified reads as never verified", async () => {
  reset()
  loadout([{ source: "private", kind: "skill", name: "notes" }])

  assert.deepEqual(await getLoadoutVerificationRecord("loadout-1"), {
    loadoutId: "loadout-1",
    verifiedReleaseTag: null,
    needsReverification: false,
  })
  assert.equal(await getLoadoutVerificationRecord("nope"), undefined)
})

test("a private-only loadout records no release tag and is never fetched upstream", async () => {
  reset()
  artifact({ id: "art-skill", type: "skill", name: "notes" })
  entries.set("art-skill", documentEntry("skill", "art-skill", "notes", "d"))
  loadout([
    {
      source: "private",
      kind: "skill",
      name: "notes",
      artifactId: "art-skill",
    },
  ])

  const health = await readLoadoutHealth({
    loadoutId: "loadout-1",
    organizationId: ORG,
  })

  assert.equal(health.releaseTag, null)
  assert.equal(upstreamFetches, 0)
})

test("resolving something that is not a loadout is refused, and an unknown loadout is a 404", async () => {
  reset()
  artifact({ id: "art-skill", type: "skill", name: "notes" })

  await assert.rejects(
    resolveLoadoutMembers({
      loadoutId: "art-skill",
      organizationId: ORG,
      loadoutVisibility: "private",
    }),
    (error) => error.status === 409
  )
  await assert.rejects(
    resolveLoadoutMembers({
      loadoutId: "nope",
      organizationId: ORG,
      loadoutVisibility: "private",
    }),
    (error) => error.status === 404
  )
})

// --- Manifest entries seam (publish gate 3.3 / install digest 4.4) ---------

test("resolveLoadoutEntries returns one manifest entry per member, ordered with them", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  const built = toolEntry("art-tool", "firecrawl", "a")
  entries.set("art-tool", built)
  const upstreamSkill = publicSkill("research", "b")
  upstream.skills = [upstreamSkill]

  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
      pinnedDigest: toolEntryArtifactDigest(built.tool),
    },
    {
      source: "public",
      kind: "skill",
      name: "research",
      pinnedDigest: skillEntryArtifactDigest(upstreamSkill),
    },
  ])

  const resolution = await resolveLoadoutEntries({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })

  assert.equal(resolution.entries.length, 2)
  assert.deepEqual(
    resolution.entries.map((entry) => entry.type),
    ["skill", "tool"]
  )
  // A public member arrives as the upstream entry itself -- its URLs already
  // point at the hub's catalog proxy -- and carries no artifact id.
  assert.equal(resolution.entries[0].skill, upstreamSkill)
  assert.equal(resolution.entries[0].artifactId, undefined)
  // A private member arrives as the entry the private builder produced.
  assert.equal(resolution.entries[1].tool, built.tool)
  assert.equal(resolution.entries[1].artifactId, "art-tool")
  // Same order as the members, so one array indexes both.
  assert.deepEqual(
    resolution.members.map((member) => member.name),
    ["research", "firecrawl"]
  )
})

test("a public soul member resolves to a soul entry, not a skill entry", async () => {
  reset()
  upstream.skills = [publicSkill("trader", "s")]
  loadout([{ source: "public", kind: "soul", name: "trader" }])

  const resolution = await resolveLoadoutEntries({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })

  assert.equal(resolution.entries[0].type, "soul")
  assert.equal(resolution.members[0].currentDigest, soulArtifactDigest("doc-s"))
})

test("entries are withheld entirely when one member does not resolve", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  entries.set("art-tool", toolEntry("art-tool", "firecrawl", "a"))
  upstream.tools = []

  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
    },
    { source: "public", kind: "tool", name: "gone" },
  ])

  const resolution = await resolveLoadoutEntries({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })

  // Never the healthy subset: a document built from this would be the partial
  // manifest the install gate exists to refuse.
  assert.equal(resolution.entries, null)
  assert.equal(resolution.members.length, 2)
  assert.equal(resolution.members[1].status, "missing")
})

test("resolveLoadoutForInstall builds member entries against the real base URL and token", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  const built = toolEntry("art-tool", "firecrawl", "a")
  entries.set("art-tool", built)
  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
      pinnedDigest: toolEntryArtifactDigest(built.tool),
    },
  ])

  const result = await resolveLoadoutForInstall({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
    baseUrl: "https://hub.example",
    token: "v1.real-token",
  })

  assert.equal(result.entries.length, 1)
  assert.deepEqual(entryBuildInputs, [
    {
      organizationId: ORG,
      artifactId: "art-tool",
      token: "v1.real-token",
      baseUrl: "https://hub.example",
    },
  ])
})

test("resolveLoadoutForInstall refuses a drifted private member and returns no entries", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  entries.set("art-tool", toolEntry("art-tool", "firecrawl", "new"))
  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
      pinnedDigest: toolEntryArtifactDigest(
        toolEntry("x", "firecrawl", "old").tool
      ),
    },
  ])

  const refusal = await rejection(
    resolveLoadoutForInstall({
      loadoutId: "loadout-1",
      organizationId: ORG,
      loadoutVisibility: "private",
      baseUrl: "https://hub.example",
      token: "v1.real-token",
    })
  )
  assert.equal(refusal.status, 409)
  assert.match(await refusal.text(), /Private tool "firecrawl" has changed/)
})

test("each member carries its own manifest entry, and the entries array is that field", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  const built = toolEntry("art-tool", "firecrawl", "a")
  entries.set("art-tool", built)
  const upstreamSkill = publicSkill("research", "b")
  upstream.skills = [upstreamSkill]

  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
    },
    { source: "public", kind: "skill", name: "research" },
  ])

  const resolution = await resolveLoadoutEntries({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })

  // The publish gate assembles its document straight off the verdicts, so the
  // two views must be the same objects in the same order -- not two
  // derivations that happen to agree today.
  assert.deepEqual(
    resolution.members.map((member) => member.entry),
    resolution.entries
  )
  assert.equal(resolution.members[0].entry.skill, upstreamSkill)
  assert.equal(resolution.members[1].entry.tool, built.tool)

  // `resolveLoadoutMembers` carries the same field, since it is the same
  // resolution with the entries array dropped.
  const members = await resolve()
  assert.equal(members[1].entry.tool, built.tool)
})

test("a member that failed to resolve carries a null entry while its healthy sibling carries one", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  const built = toolEntry("art-tool", "firecrawl", "a")
  entries.set("art-tool", built)
  upstream.tools = []

  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
    },
    { source: "public", kind: "tool", name: "gone" },
  ])

  const resolution = await resolveLoadoutEntries({
    loadoutId: "loadout-1",
    organizationId: ORG,
    loadoutVisibility: "private",
  })

  const byName = new Map(
    resolution.members.map((member) => [member.name, member])
  )
  assert.equal(byName.get("firecrawl").entry.tool, built.tool)
  assert.equal(byName.get("gone").entry, null)
  assert.equal(byName.get("gone").status, "missing")

  // And the aggregate stays all-or-nothing: one null member entry withholds
  // the whole array, so no document can be assembled over the healthy one.
  assert.equal(resolution.entries, null)
})

test("every failure mode leaves the member's entry null", async () => {
  reset()
  // Unreachable upstream, an artifact that is gone, and one that exists but
  // cannot be built into an entry.
  artifact({ id: "art-broken", type: "tool", name: "broken" })
  upstream = new Error("socket hang up")

  loadout([
    { source: "public", kind: "tool", name: "remote" },
    {
      source: "private",
      kind: "skill",
      name: "vanished",
      artifactId: "art-gone",
    },
    {
      source: "private",
      kind: "tool",
      name: "broken",
      artifactId: "art-broken",
    },
  ])

  const members = await resolve()

  assert.deepEqual(
    members.map((member) => member.status),
    ["skill:vanished", "tool:broken", "tool:remote"].map((identity) =>
      identity === "tool:remote" ? "unreachable" : "missing"
    )
  )
  assert.ok(members.every((member) => member.entry === null))
})

// --- Member links ----------------------------------------------------------

/** A hub proxy URL for an Iliad artifact: base64url of the ref tuple. */
function iliadArtifactUrl(userId, name, version, file) {
  const token = Buffer.from(
    JSON.stringify(["i", userId, name, version, file]),
    "utf8"
  ).toString("base64url")
  return `https://hub.example/api/catalog/artifact/${token}`
}

test("a private member links to its workspace page", async () => {
  reset()
  artifact({ id: "art-tool", type: "tool", name: "firecrawl" })
  entries.set("art-tool", toolEntry("art-tool", "firecrawl", "a"))
  loadout([
    {
      source: "private",
      kind: "tool",
      name: "firecrawl",
      artifactId: "art-tool",
    },
  ])

  const [member] = await resolve()

  assert.equal(member.href, "/dashboard/manage/art-tool")
})

test("a public repository member links to its marketplace page by name", async () => {
  reset()
  upstream.skills = [publicSkill("research", "b")]
  loadout([{ source: "public", kind: "skill", name: "research" }])

  const [member] = await resolve()

  assert.equal(member.href, "/marketplace/research")
})

test("a public Iliad member links by its encoded slug, not by its name", async () => {
  reset()
  const iliadSkill = {
    ...publicSkill("research", "b"),
    provenance: "verified",
    skill_md: {
      url: iliadArtifactUrl("user-1", "research", "2.0.0", "s"),
      size_bytes: 3,
      sha256: "doc-b",
    },
  }
  upstream.skills = [iliadSkill]
  loadout([{ source: "public", kind: "skill", name: "research" }])

  const [member] = await resolve()

  // An Iliad item is addressed by an encoded identity triple; linking it by
  // name would 404.
  assert.equal(
    member.href,
    `/marketplace/${createIliadSkillSlug({
      userId: "user-1",
      name: "research",
      version: "2.0.0",
    })}`
  )
  assert.notEqual(member.href, "/marketplace/research")
})

test("a member that does not resolve carries no link", async () => {
  reset()
  upstream.tools = []
  loadout([
    { source: "private", kind: "skill", name: "notes", artifactId: "art-gone" },
    { source: "public", kind: "tool", name: "gone" },
  ])

  const members = await resolve()

  assert.deepEqual(
    members.map((member) => member.href),
    [null, null]
  )

  // The same holds when upstream cannot be reached at all.
  reset()
  upstream = new Error("socket hang up")
  loadout([{ source: "public", kind: "tool", name: "remote" }])
  const [unreachable] = await resolve()
  assert.equal(unreachable.href, null)
})

test("a link is offered exactly when the member resolved to an entry", async () => {
  reset()
  artifact({ id: "art-draft", type: "skill", name: "notes", status: "draft" })
  entries.set("art-draft", documentEntry("skill", "art-draft", "notes", "d"))
  artifact({ id: "art-broken", type: "tool", name: "broken" })
  upstream.skills = [publicSkill("research", "b")]

  loadout([
    {
      source: "private",
      kind: "skill",
      name: "notes",
      artifactId: "art-draft",
    },
    {
      source: "private",
      kind: "tool",
      name: "broken",
      artifactId: "art-broken",
    },
    { source: "public", kind: "skill", name: "research" },
  ])

  const members = await resolve()

  // A draft resolves, so it is linkable even though it blocks publication --
  // the link is how its owner gets to the page that fixes it.
  for (const member of members) {
    assert.equal(
      member.href === null,
      member.entry === null,
      `${member.name} link and entry disagree`
    )
  }
  assert.equal(members[0].status, "draft")
  assert.equal(members[0].href, "/dashboard/manage/art-draft")
})
