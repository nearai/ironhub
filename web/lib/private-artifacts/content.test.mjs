import assert from "node:assert/strict"
import { mock, test } from "node:test"

const upsertCalls = []
const findFirstCalls = []
const deleteCalls = []
const putObjectCalls = []
const deleteObjectCalls = []

let findFirstResult = { id: "artifact-1" }
let contentFindFirstResult = null

mock.module("../db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        findFirst: async (args) => {
          findFirstCalls.push(args)
          return findFirstResult
        },
      },
      privateArtifactContent: {
        upsert: async (args) => {
          upsertCalls.push(args)
          return { kind: args.create.kind, sha256: args.create.sha256, sizeBytes: args.create.sizeBytes }
        },
        findFirst: async (args) => {
          findFirstCalls.push(args)
          return contentFindFirstResult
        },
        delete: async (args) => {
          deleteCalls.push(args)
          return { id: args.where.id }
        },
      },
    },
  },
})

mock.module("../storage", {
  namedExports: {
    putObject: async (key, body, contentType) => {
      putObjectCalls.push({ key, body, contentType })
    },
    deleteObject: async (key) => {
      deleteObjectCalls.push(key)
    },
  },
})

const {
  MAX_CONTENT_BYTES_BY_KIND,
  artifactContentStorageKey,
  deleteArtifactContent,
  storeArtifactContent,
  parseContentKind,
} = await import("./content.ts")

const { MAX_METADATA_BYTES, MAX_WASM_BYTES } = await import(
  "@/lib/catalog/ironclaw-contract"
)

test("parseContentKind accepts known kinds and rejects unknown ones", () => {
  assert.equal(parseContentKind("wasm"), "wasm")
  assert.throws(() => parseContentKind("bogus"))
})

test("artifactContentStorageKey builds the deterministic key layout", () => {
  assert.equal(
    artifactContentStorageKey("org-1", "artifact-1", "wasm"),
    "private-artifacts/org-1/artifact-1/wasm"
  )
})

test("storeArtifactContent uploads to S3 and persists storageKey + sha256", async () => {
  putObjectCalls.length = 0
  upsertCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  const body = new TextEncoder().encode("hello world")
  const result = await storeArtifactContent("org-1", "artifact-1", "skill_md", body)

  assert.equal(putObjectCalls.length, 1)
  assert.equal(putObjectCalls[0].key, "private-artifacts/org-1/artifact-1/skill_md")
  assert.equal(upsertCalls.length, 1)
  assert.equal(
    upsertCalls[0].create.storageKey,
    "private-artifacts/org-1/artifact-1/skill_md"
  )
  assert.equal(result.sizeBytes, body.length)
  assert.match(result.sha256, /^[0-9a-f]{64}$/)
})

test("storeArtifactContent rejects an oversized body with 413 before touching prisma or storage", async () => {
  putObjectCalls.length = 0
  findFirstCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  const oversized = new Uint8Array(256 * 1024 + 1) // over manifest_toml's 256KB cap
  await assert.rejects(
    () => storeArtifactContent("org-1", "artifact-1", "manifest_toml", oversized),
    (error) => {
      assert.ok(error instanceof Response)
      assert.equal(error.status, 413)
      return true
    }
  )
  // The size guard must fire before any DB lookup or S3 upload -- this is
  // the authoritative enforcement point every caller (direct upload and
  // bundle ingest alike) inherits, so it must not depend on side effects
  // that happen later in the function.
  assert.equal(putObjectCalls.length, 0)
  assert.equal(findFirstCalls.length, 0)
})

// --- the published-content freeze ---------------------------------------
//
// `findFirstResult` stands in for the artifact row the write path looks up.
// The fixtures above leave `status` off entirely, which is the draft case --
// these three supply it.

test("storeArtifactContent refuses a write to a published artifact whose version has not moved", async () => {
  putObjectCalls.length = 0
  upsertCalls.length = 0
  findFirstResult = {
    status: "published",
    version: "1.0.0",
    publishedVersion: "1.0.0",
  }

  try {
    await storeArtifactContent(
      "org-1",
      "artifact-1",
      "skill_md",
      new TextEncoder().encode("hello")
    )
    assert.fail("expected the write to be refused")
  } catch (error) {
    assert.ok(error instanceof Response)
    assert.equal(error.status, 409)
    assert.match(await error.text(), /Change the version before changing its files/)
  }

  // Nothing may reach storage: the point of the freeze is that the bytes a
  // published version names cannot be replaced, not that the row stays put.
  assert.equal(putObjectCalls.length, 0)
  assert.equal(upsertCalls.length, 0)
  findFirstResult = { id: "artifact-1" }
})

test("storeArtifactContent accepts a write once the version has been bumped", async () => {
  putObjectCalls.length = 0
  findFirstResult = {
    status: "published",
    version: "1.1.0",
    publishedVersion: "1.0.0",
  }

  await storeArtifactContent(
    "org-1",
    "artifact-1",
    "skill_md",
    new TextEncoder().encode("hello")
  )

  assert.equal(putObjectCalls.length, 1)
  findFirstResult = { id: "artifact-1" }
})

test("storeArtifactContent leaves a draft artifact unguarded", async () => {
  putObjectCalls.length = 0
  // A draft records no published version, so there is nothing for a bump to
  // be measured against and nothing an agent could already be running.
  findFirstResult = { status: "draft", version: "1.0.0", publishedVersion: null }

  await storeArtifactContent(
    "org-1",
    "artifact-1",
    "skill_md",
    new TextEncoder().encode("hello")
  )

  assert.equal(putObjectCalls.length, 1)
  findFirstResult = { id: "artifact-1" }
})

test("deleteArtifactContent is refused on a frozen published artifact", async () => {
  deleteCalls.length = 0
  deleteObjectCalls.length = 0
  findFirstResult = {
    status: "published",
    version: "2.0.0",
    publishedVersion: "2.0.0",
  }
  contentFindFirstResult = {
    id: "content-1",
    storageKey: "private-artifacts/org-1/artifact-1/wasm",
  }

  await assert.rejects(
    () => deleteArtifactContent("org-1", "artifact-1", "wasm"),
    (error) => error instanceof Response && error.status === 409
  )
  assert.equal(deleteCalls.length, 0)
  assert.equal(deleteObjectCalls.length, 0)
  findFirstResult = { id: "artifact-1" }
})

test("storeArtifactContent 404s when the artifact is not found in the org", async () => {
  findFirstResult = null
  await assert.rejects(
    () => storeArtifactContent("org-1", "missing", "skill_md", new Uint8Array([1])),
    (error) => error instanceof Response && error.status === 404
  )
})

test("deleteArtifactContent removes the row then the S3 object", async () => {
  deleteObjectCalls.length = 0
  deleteCalls.length = 0
  // A delete now looks the artifact up first, to check the published-content
  // freeze -- a draft (no status) is unfrozen, so this stays a plain delete.
  findFirstResult = { id: "artifact-1" }
  contentFindFirstResult = {
    id: "content-1",
    storageKey: "private-artifacts/org-1/artifact-1/wasm",
  }

  await deleteArtifactContent("org-1", "artifact-1", "wasm")

  assert.equal(deleteCalls.length, 1)
  assert.equal(deleteCalls[0].where.id, "content-1")
  assert.deepEqual(deleteObjectCalls, ["private-artifacts/org-1/artifact-1/wasm"])
})

test("deleteArtifactContent 404s when no content row exists", async () => {
  findFirstResult = { id: "artifact-1" }
  contentFindFirstResult = null
  await assert.rejects(
    () => deleteArtifactContent("org-1", "artifact-1", "wasm"),
    (error) => error instanceof Response && error.status === 404
  )
})

// --- Task 10.1 / 10.5: caps that match what the agent will accept ------------

test("task 10.1: every agent-bounded kind reads its ceiling from the contract module", () => {
  // Restating a number the agent owns is how `skill_md` came to accept 5MB
  // against the agent's 1MB, so an upload could succeed and the install then
  // fail with `artifact exceeds 1048576 byte cap` (design.md D7).
  assert.equal(MAX_CONTENT_BYTES_BY_KIND.skill_md, MAX_METADATA_BYTES)
  assert.equal(MAX_CONTENT_BYTES_BY_KIND.capabilities, MAX_METADATA_BYTES)
  assert.equal(MAX_CONTENT_BYTES_BY_KIND.wasm, MAX_WASM_BYTES)
  // Deliberately tighter than the agent's 1MB, and therefore ours to state.
  assert.equal(MAX_CONTENT_BYTES_BY_KIND.manifest_toml, 256 * 1024)
})

test("task 10.5: a 2MB skill document is rejected with 413 naming the 1MB limit", async () => {
  putObjectCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  let thrown = null
  try {
    await storeArtifactContent(
      "org-1",
      "artifact-1",
      "skill_md",
      new Uint8Array(2 * 1024 * 1024)
    )
  } catch (error) {
    thrown = error
  }

  assert.ok(thrown instanceof Response)
  assert.equal(thrown.status, 413)
  assert.match(await thrown.text(), /1MB limit for skill_md/)
  // Rejected before the object is written, not after.
  assert.equal(putObjectCalls.length, 0)
})

test("task 10.5: a 12MB wasm module is accepted", async () => {
  putObjectCalls.length = 0
  upsertCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  const result = await storeArtifactContent(
    "org-1",
    "artifact-1",
    "wasm",
    new Uint8Array(12 * 1024 * 1024)
  )

  // 12MB failed the old 5MB cap for no reason the agent shares: it accepts up
  // to 16MB.
  assert.equal(result.sizeBytes, 12 * 1024 * 1024)
  assert.equal(putObjectCalls.length, 1)
})

test("a wasm module past the agent's own ceiling is still rejected", async () => {
  putObjectCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  await assert.rejects(
    () =>
      storeArtifactContent(
        "org-1",
        "artifact-1",
        "wasm",
        new Uint8Array(MAX_WASM_BYTES + 1)
      ),
    (error) => error instanceof Response && error.status === 413
  )
  assert.equal(putObjectCalls.length, 0)
})

// --- Souls ------------------------------------------------------------------

test("a soul document and its readme read their ceiling from the agent's metadata bound", () => {
  // A soul publishes as a skill document, so the number the agent enforces on
  // it is the same one -- restating it here is how skill_md came to accept
  // 5MB against the agent's 1MB.
  assert.equal(MAX_CONTENT_BYTES_BY_KIND.soul_md, MAX_METADATA_BYTES)
  assert.equal(MAX_CONTENT_BYTES_BY_KIND.readme_md, MAX_METADATA_BYTES)
})

test("parseContentKind accepts the soul kinds", () => {
  assert.equal(parseContentKind("soul_md"), "soul_md")
  assert.equal(parseContentKind("readme_md"), "readme_md")
})

test("storeArtifactContent stores a soul document with its size and sha256", async () => {
  putObjectCalls.length = 0
  upsertCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  const body = new TextEncoder().encode("# Who you are\n\nYou are careful.\n")
  const result = await storeArtifactContent(
    "org-1",
    "artifact-1",
    "soul_md",
    body
  )

  assert.equal(putObjectCalls.length, 1)
  assert.equal(
    putObjectCalls[0].key,
    "private-artifacts/org-1/artifact-1/soul_md"
  )
  assert.equal(putObjectCalls[0].contentType, "text/markdown; charset=utf-8")
  assert.equal(result.sizeBytes, body.length)
  assert.match(result.sha256, /^[0-9a-f]{64}$/)
})

test("a whitespace-only soul document is refused with 400 before anything is stored", async () => {
  putObjectCalls.length = 0
  upsertCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  let thrown = null
  try {
    await storeArtifactContent(
      "org-1",
      "artifact-1",
      "soul_md",
      new TextEncoder().encode("   \n\t\n  ")
    )
  } catch (error) {
    thrown = error
  }

  assert.ok(thrown instanceof Response)
  assert.equal(thrown.status, 400)
  assert.match(await thrown.text(), /must have content/)
  assert.equal(putObjectCalls.length, 0)
  assert.equal(upsertCalls.length, 0)
})

test("an empty soul document is refused the same way", async () => {
  findFirstResult = { id: "artifact-1" }

  await assert.rejects(
    () => storeArtifactContent("org-1", "artifact-1", "soul_md", new Uint8Array()),
    (error) => error instanceof Response && error.status === 400
  )
})

test("a 2MB soul document is rejected with 413 naming the 1MB limit", async () => {
  putObjectCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  let thrown = null
  try {
    await storeArtifactContent(
      "org-1",
      "artifact-1",
      "soul_md",
      new Uint8Array(2 * 1024 * 1024)
    )
  } catch (error) {
    thrown = error
  }

  assert.ok(thrown instanceof Response)
  assert.equal(thrown.status, 413)
  assert.match(await thrown.text(), /1MB limit for soul_md/)
  assert.equal(putObjectCalls.length, 0)
})

test("an empty readme is stored, because only the soul document must say something", async () => {
  putObjectCalls.length = 0
  findFirstResult = { id: "artifact-1" }

  const result = await storeArtifactContent(
    "org-1",
    "artifact-1",
    "readme_md",
    new TextEncoder().encode("   ")
  )

  assert.equal(result.sizeBytes, 3)
  assert.equal(putObjectCalls.length, 1)
})

test("neither soul kind is served as a redirect", async () => {
  const { REDIRECT_CONTENT_KINDS } = await import("./content.ts")

  // Relayed, matching skill_md: these are small text documents, and the
  // owner-facing editors and the install disclosure read them inline.
  assert.equal(REDIRECT_CONTENT_KINDS.has("soul_md"), false)
  assert.equal(REDIRECT_CONTENT_KINDS.has("readme_md"), false)
})
