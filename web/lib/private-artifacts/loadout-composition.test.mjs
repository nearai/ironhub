import assert from "node:assert/strict"
import { mock, test } from "node:test"

import { Prisma } from "../prisma/client"

/**
 * Minimal in-memory fake for the subset of the Prisma Client API
 * loadout-composition.ts uses. Like the fake in service.test.mjs it ignores
 * `select` shape, but it does honor two things the behaviour under test
 * depends on: `findFirst` scopes artifacts by organization (that scoping is
 * what refuses a cross-organization member), and `create` enforces the real
 * (loadoutId, source, kind, name) unique index.
 */
function makeFakeDb() {
  const artifacts = new Map()
  const members = new Map()

  return {
    artifacts,
    members,
    prisma: {
      privateArtifact: {
        findFirst: async ({ where }) => {
          const record = artifacts.get(where.id)
          if (!record || record.organizationId !== where.organizationId) {
            return null
          }
          return { ...record }
        },
      },
      loadoutMember: {
        create: async ({ data }) => {
          const clash = [...members.values()].some(
            (existing) =>
              existing.loadoutId === data.loadoutId &&
              existing.source === data.source &&
              existing.kind === data.kind &&
              existing.name === data.name
          )
          if (clash) {
            throw new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              { code: "P2002", clientVersion: "test" }
            )
          }
          const record = {
            version: null,
            artifactId: null,
            pinnedDigest: null,
            createdAt: new Date(),
            ...data,
          }
          members.set(record.id, record)
          return { ...record }
        },
        findMany: async ({ where, orderBy }) => {
          const rows = [...members.values()].filter(
            (record) => record.loadoutId === where.loadoutId
          )
          if (orderBy) {
            rows.sort(
              (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
            )
          }
          return rows.map((record) => ({ ...record }))
        },
        findFirst: async ({ where }) => {
          const record = [...members.values()].find(
            (candidate) =>
              (where.id === undefined || candidate.id === where.id) &&
              (where.loadoutId === undefined ||
                candidate.loadoutId === where.loadoutId) &&
              (where.kind === undefined || candidate.kind === where.kind)
          )
          return record ? { ...record } : null
        },
        delete: async ({ where }) => {
          const record = members.get(where.id)
          members.delete(where.id)
          return record
        },
        update: async ({ where, data }) => {
          const record = members.get(where.id)
          Object.assign(record, data)
          return { ...record }
        },
      },
    },
  }
}

const { prisma, artifacts, members } = makeFakeDb()

mock.module("../db", { namedExports: { prisma } })

// Member health is owned elsewhere (loadout-health.ts). The publish gate is
// specified against its verdicts, not against how it reaches them, so it is
// mocked here: these tests are about what the gate does with a verdict.
let resolution = []
let resolveInputs = []

mock.module("./loadout-health", {
  namedExports: {
    resolveLoadoutMembers: async (input) => {
      resolveInputs.push(input)
      return resolution
    },
  },
})

const {
  addLoadoutMember,
  assertLoadoutPublishable,
  listLoadoutMembers,
  loadoutDocumentAssembler,
  measureLoadoutDocument,
  pinLoadoutMembers,
  removeLoadoutMember,
} = await import("./loadout-composition.ts")

const ORG = "org-1"
const OTHER_ORG = "org-2"

function reset() {
  artifacts.clear()
  members.clear()
  upstream = { tools: [], skills: [] }
  upstreamError = null
  resolution = []
  resolveInputs = []
}

// The public catalog is injected rather than mocked, because that is how
// production supplies it too: composition never imports the catalog reader.
let upstream = { tools: [], skills: [] }
let upstreamError = null

const lookupPublicCatalog = async () => {
  if (upstreamError) throw upstreamError
  return upstream
}

function addOptions() {
  return { lookupPublicCatalog }
}

/**
 * The document a loadout of these members would publish, stubbed. The real
 * assembler is the manifest builder's (task 4.1); what the gate needs from it
 * here is a document to measure.
 */
function assembler(document) {
  return async () => document
}

function emptyDocument(loadoutId) {
  return {
    version: "1",
    generated_at: "2026-01-01T00:00:00.000Z",
    release_tag: `private-${loadoutId}`,
    repo: "ironhub-private",
    tools: [],
    skills: [],
  }
}

function putArtifact(overrides) {
  const record = {
    id: `artifact-${artifacts.size + 1}`,
    organizationId: ORG,
    type: "tool",
    name: "some-tool",
    title: "Some Tool",
    version: "1.0.0",
    visibility: "private",
    status: "draft",
    ...overrides,
  }
  artifacts.set(record.id, record)
  return record
}

function putLoadout(overrides = {}) {
  return putArtifact({
    id: "loadout-1",
    type: "loadout",
    name: "a-trader",
    ...overrides,
  })
}

function resolved(overrides) {
  return {
    memberId: "member-1",
    source: "private",
    kind: "tool",
    name: "some-tool",
    pinnedVersion: null,
    pinnedDigest: null,
    currentVersion: "1.0.0",
    currentDigest: "sha256:aaa",
    status: "ok",
    reason: null,
    blocksInstall: false,
    blocksPublish: false,
    entry: null,
    ...overrides,
  }
}

function toolEntry(name) {
  return { type: "tool", tool: { name, version: "1.0.0" } }
}

function skillEntry(name, type = "skill") {
  return { type, skill: { name, version: "1.0.0" } }
}

async function rejection(promise) {
  try {
    await promise
  } catch (error) {
    return error
  }
  assert.fail("expected a rejection")
}

// --- Composition (task 8.1) -------------------------------------------------

test("task 8.1: a loadout cannot be added to another loadout", async () => {
  reset()
  const loadout = putLoadout()
  const nested = putArtifact({ id: "artifact-2", type: "loadout", name: "other" })

  const error = await rejection(
    addLoadoutMember(ORG, loadout.id, {
      source: "private",
      artifactId: nested.id,
    })
  )

  assert.ok(error instanceof Response)
  assert.equal(error.status, 409)
  const message = await error.text()
  assert.match(message, /cannot be nested/)
  assert.match(message, /other/)
  assert.equal(members.size, 0)
})

test("task 8.1: a second soul is refused, naming the soul already there", async () => {
  reset()
  const loadout = putLoadout()
  const first = putArtifact({ id: "artifact-2", type: "soul", name: "the-trader" })
  const second = putArtifact({ id: "artifact-3", type: "soul", name: "the-analyst" })

  await addLoadoutMember(ORG, loadout.id, {
    source: "private",
    artifactId: first.id,
  })
  const error = await rejection(
    addLoadoutMember(ORG, loadout.id, {
      source: "private",
      artifactId: second.id,
    })
  )

  assert.equal(error.status, 409)
  const message = await error.text()
  assert.match(message, /the-trader/)
  assert.equal(members.size, 1)
})

test("task 8.1: a private artifact from another organization is not addable", async () => {
  reset()
  const loadout = putLoadout()
  const foreign = putArtifact({
    id: "artifact-2",
    organizationId: OTHER_ORG,
    name: "their-tool",
  })

  const error = await rejection(
    addLoadoutMember(ORG, loadout.id, {
      source: "private",
      artifactId: foreign.id,
    })
  )

  // A 404 rather than a 403: the refusal must not confirm that the id exists
  // in some other organization.
  assert.equal(error.status, 404)
  assert.equal(members.size, 0)
})

test("a private member records artifactId, which is what the RESTRICT delete rule protects", async () => {
  reset()
  const loadout = putLoadout()
  const tool = putArtifact({ id: "artifact-2", name: "scraper" })

  const member = await addLoadoutMember(ORG, loadout.id, {
    source: "private",
    artifactId: tool.id,
  })

  assert.equal(member.source, "private")
  assert.equal(member.kind, "tool")
  assert.equal(member.name, "scraper")
  assert.equal(member.artifactId, tool.id)
})

test("a member is added without a version or digest, because a pin is recorded at publish", async () => {
  reset()
  const loadout = putLoadout()
  const tool = putArtifact({ id: "artifact-2", version: "3.1.0" })

  const member = await addLoadoutMember(ORG, loadout.id, {
    source: "private",
    artifactId: tool.id,
  })

  assert.equal(member.version, null)
  assert.equal(member.pinnedDigest, null)
})

test("task 8.1: a verified public marketplace entry is recorded with source public", async () => {
  reset()
  const loadout = putLoadout()
  upstream = { tools: [{ name: "firecrawl" }], skills: [] }

  const member = await addLoadoutMember(
    ORG,
    loadout.id,
    { source: "public", name: "firecrawl" },
    addOptions()
  )

  assert.equal(member.source, "public")
  assert.equal(member.kind, "tool")
  assert.equal(member.name, "firecrawl")
  // No bytes are copied, so there is no hub row to point at.
  assert.equal(member.artifactId, null)
})

test("a name the upstream catalog does not publish is refused", async () => {
  reset()
  const loadout = putLoadout()
  upstream = { tools: [{ name: "firecrawl" }], skills: [] }

  const error = await rejection(
    addLoadoutMember(
      ORG,
      loadout.id,
      { source: "public", name: "ghost" },
      addOptions()
    )
  )

  assert.equal(error.status, 404)
  assert.match(await error.text(), /ghost/)
})

test("an unreachable upstream catalog is refused as unreachable, not as a missing entry", async () => {
  reset()
  const loadout = putLoadout()
  upstreamError = new Error("socket hang up")

  const error = await rejection(
    addLoadoutMember(
      ORG,
      loadout.id,
      { source: "public", name: "firecrawl" },
      addOptions()
    )
  )

  // 502, not 404: the entry may be perfectly fine and the catalog merely
  // unreadable, and an author told their tool is gone would go looking for a
  // replacement they do not need.
  assert.equal(error.status, 502)
  assert.match(await error.text(), /could not be read/)
})

test("a name published upstream as both a tool and a skill is refused until the kind is given", async () => {
  reset()
  const loadout = putLoadout()
  upstream = { tools: [{ name: "summarise" }], skills: [{ name: "summarise" }] }

  const error = await rejection(
    addLoadoutMember(
      ORG,
      loadout.id,
      { source: "public", name: "summarise" },
      addOptions()
    )
  )
  assert.equal(error.status, 409)
  assert.match(await error.text(), /which kind/)

  const member = await addLoadoutMember(
    ORG,
    loadout.id,
    { source: "public", name: "summarise", kind: "skill" },
    addOptions()
  )
  assert.equal(member.kind, "skill")
})

test("adding the same member twice is refused instead of duplicating it", async () => {
  reset()
  const loadout = putLoadout()
  const tool = putArtifact({ id: "artifact-2", name: "scraper" })

  await addLoadoutMember(ORG, loadout.id, {
    source: "private",
    artifactId: tool.id,
  })
  const error = await rejection(
    addLoadoutMember(ORG, loadout.id, {
      source: "private",
      artifactId: tool.id,
    })
  )

  assert.equal(error.status, 409)
  assert.match(await error.text(), /already a member/)
  assert.equal(members.size, 1)
})

test("members are listed in kind then name order rather than insertion order", async () => {
  reset()
  const loadout = putLoadout()
  putArtifact({ id: "artifact-2", type: "soul", name: "the-trader" })
  putArtifact({ id: "artifact-3", type: "tool", name: "zebra" })
  putArtifact({ id: "artifact-4", type: "tool", name: "alpha" })

  await addLoadoutMember(ORG, loadout.id, { source: "private", artifactId: "artifact-3" })
  await addLoadoutMember(ORG, loadout.id, { source: "private", artifactId: "artifact-2" })
  await addLoadoutMember(ORG, loadout.id, { source: "private", artifactId: "artifact-4" })

  const listed = await listLoadoutMembers(ORG, loadout.id)

  assert.deepEqual(
    listed.map((member) => `${member.kind}/${member.name}`),
    ["soul/the-trader", "tool/alpha", "tool/zebra"]
  )
})

test("members cannot be listed on an artifact that is not a loadout", async () => {
  reset()
  const tool = putArtifact({ id: "artifact-2", name: "scraper" })

  const error = await rejection(listLoadoutMembers(ORG, tool.id))

  assert.equal(error.status, 409)
  assert.match(await error.text(), /has no members/)
})

test("another organization's loadout is not readable", async () => {
  reset()
  putLoadout({ organizationId: OTHER_ORG })

  const error = await rejection(listLoadoutMembers(ORG, "loadout-1"))

  assert.equal(error.status, 404)
})

test("removeLoadoutMember deletes the member it names", async () => {
  reset()
  const loadout = putLoadout()
  putArtifact({ id: "artifact-2", name: "scraper" })
  const member = await addLoadoutMember(ORG, loadout.id, {
    source: "private",
    artifactId: "artifact-2",
  })

  await removeLoadoutMember(ORG, loadout.id, member.id)

  assert.equal(members.size, 0)
})

test("removeLoadoutMember 404s for a member id belonging to a different loadout", async () => {
  reset()
  const loadout = putLoadout()
  putLoadout({ id: "loadout-2", name: "an-analyst" })
  putArtifact({ id: "artifact-2", name: "scraper" })
  const member = await addLoadoutMember(ORG, "loadout-2", {
    source: "private",
    artifactId: "artifact-2",
  })

  const error = await rejection(
    removeLoadoutMember(ORG, loadout.id, member.id)
  )

  assert.equal(error.status, 404)
  assert.equal(members.size, 1)
})

// --- Publish gate (task 8.2) ------------------------------------------------

test("task 8.2: a draft member blocks publication and is named", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [
    resolved({
      status: "draft",
      reason: "tool scraper is still a draft",
      blocksPublish: true,
    }),
  ]

  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  assert.equal(error.status, 409)
  assert.match(await error.text(), /tool scraper is still a draft/)
})

test("task 8.2: a member more private than the loadout blocks publication", async () => {
  reset()
  const loadout = putLoadout({ visibility: "public" })
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [
    resolved({
      status: "visibility_too_narrow",
      reason: "tool scraper is private and this loadout is public",
      blocksPublish: true,
    }),
  ]

  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  assert.equal(error.status, 409)
  assert.match(await error.text(), /scraper is private/)
  // The gate asks about the loadout's own visibility, since that is the whole
  // question the visibility rule answers.
  assert.deepEqual(resolveInputs, [
    { loadoutId: loadout.id, organizationId: ORG, loadoutVisibility: "public" },
  ])
})

test("task 8.2: an unresolvable member blocks publication", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [
    resolved({
      source: "public",
      status: "missing",
      reason: "tool firecrawl is no longer published upstream",
      blocksPublish: true,
    }),
  ]

  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  assert.equal(error.status, 409)
  assert.match(await error.text(), /no longer published upstream/)
})

test("task 8.2: every failing member is named, not only the first", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  members.set("member-2", { id: "member-2", loadoutId: loadout.id })
  members.set("member-3", { id: "member-3", loadoutId: loadout.id })
  resolution = [
    resolved({
      memberId: "member-1",
      status: "draft",
      reason: "tool scraper is still a draft",
      blocksPublish: true,
    }),
    resolved({ memberId: "member-2", name: "healthy" }),
    resolved({
      memberId: "member-3",
      status: "missing",
      reason: "skill summarise cannot be resolved",
      blocksPublish: true,
    }),
  ]

  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  const message = await error.text()
  assert.match(message, /scraper is still a draft/)
  assert.match(message, /summarise cannot be resolved/)
})

test("a blocking member with no reason is still named rather than reported anonymously", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [
    resolved({ name: "scraper", status: "unreachable", blocksPublish: true }),
  ]

  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  const message = await error.text()
  assert.match(message, /scraper/)
  assert.match(message, /unreachable/)
})

test("a member updated upstream does not block publication", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [
    resolved({
      source: "public",
      status: "updated_upstream",
      reason: "tool firecrawl has been re-released upstream",
      blocksPublish: false,
    }),
  ]

  const approved = await assertLoadoutPublishable(ORG, loadout, {
    assembleDocument: assembler(emptyDocument(loadout.id)),
  })

  assert.equal(approved.length, 1)
})

test("task 3.1: publishing pins each member to the version and digest that resolved", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", {
    id: "member-1",
    loadoutId: loadout.id,
    version: null,
    pinnedDigest: null,
  })
  resolution = [
    resolved({ currentVersion: "2.4.0", currentDigest: "sha256:beef" }),
  ]

  await pinLoadoutMembers(
    await assertLoadoutPublishable(ORG, loadout, {
      assembleDocument: assembler(emptyDocument(loadout.id)),
    })
  )

  assert.equal(members.get("member-1").version, "2.4.0")
  assert.equal(members.get("member-1").pinnedDigest, "sha256:beef")
})

test("task 3.3: publication is refused when no document can be assembled to measure", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", {
    id: "member-1",
    loadoutId: loadout.id,
    version: "1.0.0",
    pinnedDigest: "sha256:old",
  })
  resolution = [resolved()]

  // Fails closed: an unmeasured document is not a document known to fit.
  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  assert.equal(error.status, 409)
  assert.match(await error.text(), /could not be assembled/)
  assert.equal(members.get("member-1").pinnedDigest, "sha256:old")
})

test("a refused publish leaves the previous pins untouched", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", {
    id: "member-1",
    loadoutId: loadout.id,
    version: "1.0.0",
    pinnedDigest: "sha256:old",
  })
  resolution = [
    resolved({
      status: "drifted",
      reason: "tool scraper has drifted",
      blocksPublish: true,
      currentVersion: "2.0.0",
      currentDigest: "sha256:new",
    }),
  ]

  await rejection(assertLoadoutPublishable(ORG, loadout))

  assert.equal(members.get("member-1").version, "1.0.0")
  assert.equal(members.get("member-1").pinnedDigest, "sha256:old")
})

// --- Empty loadouts and document size (task 8.4) ----------------------------

test("task 8.4: a loadout with no members cannot be published", async () => {
  reset()
  const loadout = putLoadout()

  const error = await rejection(assertLoadoutPublishable(ORG, loadout))

  assert.equal(error.status, 409)
  assert.match(await error.text(), /at least one member/)
  // Nothing was resolved: there was nothing to resolve, and the message an
  // author needs is about members rather than about resolution.
  assert.deepEqual(resolveInputs, [])
})

test("task 8.4: an empty loadout is still a legal draft", async () => {
  reset()
  const loadout = putLoadout()

  assert.deepEqual(await listLoadoutMembers(ORG, loadout.id), [])
})

test("task 8.4: an assembled document over the agent's ceiling refuses publication, naming the measured size", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [resolved()]

  const oversized = {
    version: "1",
    generated_at: "2026-01-01T00:00:00.000Z",
    release_tag: `private-${loadout.id}`,
    repo: "ironhub-private",
    tools: [{ name: "x".repeat(1024 * 1024 + 1) }],
    skills: [],
  }
  const measured = Buffer.byteLength(JSON.stringify(oversized), "utf8")

  const error = await rejection(
    assertLoadoutPublishable(ORG, loadout, {
      assembleDocument: async () => oversized,
    })
  )

  assert.equal(error.status, 409)
  const message = await error.text()
  assert.match(message, new RegExp(String(measured)))
  assert.match(message, new RegExp(String(1024 * 1024)))
})

test("task 8.4: the assembler is handed the resolution the gate approved", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [resolved()]

  let seen = null
  const approved = await assertLoadoutPublishable(ORG, loadout, {
    assembleDocument: async (input) => {
      seen = input
      return {
        version: "1",
        generated_at: "2026-01-01T00:00:00.000Z",
        release_tag: `private-${loadout.id}`,
        repo: "ironhub-private",
        tools: [],
        skills: [],
      }
    },
  })

  assert.equal(approved.length, 1)
  assert.equal(seen.loadoutId, loadout.id)
  assert.equal(seen.organizationId, ORG)
  assert.deepEqual(seen.members, resolution)
})

test("measureLoadoutDocument reports both C11 ceilings for a document past them", () => {
  const huge = {
    version: "1",
    generated_at: "2026-01-01T00:00:00.000Z",
    release_tag: "private-loadout-1",
    repo: "ironhub-private",
    tools: [{ name: "x".repeat(2 * 1024 * 1024) }],
    skills: [],
  }

  const failures = measureLoadoutDocument(huge)

  assert.equal(failures.length, 2)
  assert.match(failures[0], /manifest document is \d+ bytes/)
  assert.match(failures[1], /signed manifest envelope is \d+ bytes/)
})

test("measureLoadoutDocument passes a document inside the ceilings", () => {
  const small = {
    version: "1",
    generated_at: "2026-01-01T00:00:00.000Z",
    release_tag: "private-loadout-1",
    repo: "ironhub-private",
    tools: [],
    skills: [],
  }

  assert.deepEqual(measureLoadoutDocument(small), [])
})

// --- The wired assembler (task 3.3) -----------------------------------------

test("task 3.3: the assembler builds the document from the entries the members already resolved to", async () => {
  const document = await loadoutDocumentAssembler({
    organizationId: ORG,
    loadoutId: "loadout-1",
    members: [
      resolved({ memberId: "m1", kind: "tool", entry: toolEntry("scraper") }),
      resolved({ memberId: "m2", kind: "skill", entry: skillEntry("summarise") }),
      resolved({
        memberId: "m3",
        kind: "soul",
        entry: skillEntry("the-trader", "soul"),
      }),
    ],
  })

  assert.deepEqual(
    document.tools.map((tool) => tool.name),
    ["scraper"]
  )
  // A soul rides in skills[] because that is where the agent looks for a
  // document to install; there is no souls[] to put it in.
  assert.deepEqual(
    document.skills.map((skill) => skill.name),
    ["summarise", "the-trader"]
  )
  assert.equal(document.release_tag, "private-loadout-1")
})

test("task 3.3: an approved member carrying no entry refuses rather than being measured out of the document", async () => {
  const error = await rejection(
    loadoutDocumentAssembler({
      organizationId: ORG,
      loadoutId: "loadout-1",
      members: [
        resolved({ memberId: "m1", entry: toolEntry("scraper") }),
        resolved({ memberId: "m2", name: "summarise", kind: "skill", entry: null }),
      ],
    })
  )

  assert.equal(error.status, 409)
  assert.match(await error.text(), /summarise did not resolve/)
})

test("task 3.3: the gate measures the document the wired assembler produces", async () => {
  reset()
  const loadout = putLoadout()
  members.set("member-1", { id: "member-1", loadoutId: loadout.id })
  resolution = [resolved({ entry: toolEntry("scraper") })]

  const approved = await assertLoadoutPublishable(ORG, loadout, {
    assembleDocument: loadoutDocumentAssembler,
  })

  assert.equal(approved.length, 1)
})
