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

const { artifactContentStorageKey, deleteArtifactContent, storeArtifactContent, parseContentKind } =
  await import("./content.ts")

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
  contentFindFirstResult = null
  await assert.rejects(
    () => deleteArtifactContent("org-1", "artifact-1", "wasm"),
    (error) => error instanceof Response && error.status === 404
  )
})
