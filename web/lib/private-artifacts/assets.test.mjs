import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mock, test } from "node:test"

const putObjectCalls = []
const deleteObjectCalls = []
const upsertCalls = []
const deleteCalls = []

let artifactFindFirstResult = { id: "artifact-1" }
// The rows a prune pass would find already stored, as { id, kind, path, storageKey }.
let existingAssets = []
let deleteObjectThrows = false

mock.module("../db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        findFirst: async () => artifactFindFirstResult,
      },
      privateArtifactAsset: {
        upsert: async (args) => {
          upsertCalls.push(args)
          return { id: "asset-row" }
        },
        findMany: async () => existingAssets,
        findFirst: async (args) =>
          existingAssets.find(
            (asset) =>
              asset.kind === args.where.kind && asset.path === args.where.path
          ) ?? null,
        delete: async (args) => {
          deleteCalls.push(args.where.id)
          existingAssets = existingAssets.filter((asset) => asset.id !== args.where.id)
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
      if (deleteObjectThrows) throw new Error("storage is down")
      deleteObjectCalls.push(key)
    },
  },
})

const {
  MAX_ASSET_BYTES,
  artifactAssetStorageKey,
  deleteArtifactAsset,
  getArtifactAssetMetadata,
  parseAssetKind,
  replaceArtifactAssets,
} = await import("./assets.ts")

const encode = (text) => new TextEncoder().encode(text)

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

function reset() {
  putObjectCalls.length = 0
  deleteObjectCalls.length = 0
  upsertCalls.length = 0
  deleteCalls.length = 0
  artifactFindFirstResult = { id: "artifact-1" }
  existingAssets = []
  deleteObjectThrows = false
}

test("parseAssetKind accepts the two asset classes and rejects anything else", () => {
  assert.equal(parseAssetKind("schema"), "schema")
  assert.equal(parseAssetKind("prompt"), "prompt")
  // `wasm` is a content kind, not an asset kind -- the two namespaces must
  // not leak into each other.
  assert.throws(() => parseAssetKind("wasm"))
  assert.throws(() => parseAssetKind("schemas"))
})

test("artifactAssetStorageKey extends the content key layout with the asset dimension", () => {
  assert.equal(
    artifactAssetStorageKey("org-1", "artifact-1", "schema", "schemas/test/in.json"),
    "private-artifacts/org-1/artifact-1/assets/schema/schemas/test/in.json"
  )
  // The kind segment is what keeps a schema and a prompt at the same declared
  // path from colliding in storage.
  assert.notEqual(
    artifactAssetStorageKey("org-1", "artifact-1", "schema", "a/b.json"),
    artifactAssetStorageKey("org-1", "artifact-1", "prompt", "a/b.json")
  )
})

test("replaceArtifactAssets stores every asset it is given", async () => {
  reset()
  const schemaBytes = encode('{"type":"object"}')
  const stored = await replaceArtifactAssets("org-1", "artifact-1", [
    { kind: "schema", path: "schemas/a.json", bytes: schemaBytes },
    { kind: "schema", path: "schemas/b.json", bytes: encode('{"b":1}') },
    { kind: "prompt", path: "prompts/a.md", bytes: encode("# a") },
  ])

  // "Nothing is dropped to fit": stored count equals declared count.
  assert.equal(stored.length, 3)
  assert.equal(putObjectCalls.length, 3)
  assert.deepEqual(
    stored.map((asset) => `${asset.kind} ${asset.path}`),
    ["schema schemas/a.json", "schema schemas/b.json", "prompt prompts/a.md"]
  )

  // Integrity metadata is recorded per asset, over the exact bytes stored, and
  // the row and the object are written under the same key.
  assert.equal(stored[0].sizeBytes, schemaBytes.length)
  assert.equal(
    stored[0].sha256,
    createHash("sha256").update(schemaBytes).digest("hex")
  )
  assert.equal(
    putObjectCalls[0].key,
    "private-artifacts/org-1/artifact-1/assets/schema/schemas/a.json"
  )
  assert.equal(putObjectCalls[0].contentType, "application/json")
  assert.equal(upsertCalls[0].create.sha256, stored[0].sha256)
  assert.equal(upsertCalls[0].where.artifactId_kind_path.path, "schemas/a.json")
})

test("replaceArtifactAssets 404s when the artifact is not in the org", async () => {
  reset()
  artifactFindFirstResult = null
  await assert.rejects(
    () =>
      replaceArtifactAssets("org-1", "missing", [
        { kind: "schema", path: "schemas/a.json", bytes: encode("{}") },
      ]),
    (error) => error instanceof Response && error.status === 404
  )
  assert.equal(putObjectCalls.length, 0)
})

test("replaceArtifactAssets rejects an unpublishable path before touching storage", async () => {
  reset()
  await assert.rejects(
    () =>
      replaceArtifactAssets("org-1", "artifact-1", [
        { kind: "schema", path: "../secret.json", bytes: encode("{}") },
      ]),
    (error) => error instanceof Response && error.status === 400
  )
  assert.equal(putObjectCalls.length, 0)
})

test("replaceArtifactAssets rejects an oversized asset with 413 naming the path", async () => {
  reset()
  await assertResponseRejection(
    () =>
      replaceArtifactAssets("org-1", "artifact-1", [
        {
          kind: "schema",
          path: "schemas/test/in.json",
          bytes: new Uint8Array(MAX_ASSET_BYTES + 1),
        },
      ]),
    413,
    /^Asset schemas\/test\/in\.json exceeds the 1MB limit/
  )
  assert.equal(putObjectCalls.length, 0)
})

test("replaceArtifactAssets deletes stored assets the new set no longer declares", async () => {
  reset()
  existingAssets = [
    {
      id: "old-1",
      kind: "schema",
      path: "schemas/dropped.json",
      storageKey: "private-artifacts/org-1/artifact-1/assets/schema/schemas/dropped.json",
    },
    {
      id: "old-2",
      kind: "schema",
      path: "schemas/a.json",
      storageKey: "private-artifacts/org-1/artifact-1/assets/schema/schemas/a.json",
    },
    {
      id: "old-3",
      kind: "prompt",
      path: "prompts/dropped.md",
      storageKey: "private-artifacts/org-1/artifact-1/assets/prompt/prompts/dropped.md",
    },
  ]

  await replaceArtifactAssets("org-1", "artifact-1", [
    { kind: "schema", path: "schemas/a.json", bytes: encode("{}") },
  ])

  // Only the two the new bundle stopped declaring; the re-declared one is
  // updated in place, not deleted and re-created.
  assert.deepEqual(deleteCalls.sort(), ["old-1", "old-3"])
  assert.deepEqual(deleteObjectCalls.sort(), [
    "private-artifacts/org-1/artifact-1/assets/prompt/prompts/dropped.md",
    "private-artifacts/org-1/artifact-1/assets/schema/schemas/dropped.json",
  ])
})

test("replaceArtifactAssets keeps a same-path asset under the other kind", async () => {
  reset()
  existingAssets = [
    { id: "old-1", kind: "prompt", path: "docs/thing.md", storageKey: "k1" },
  ]
  await replaceArtifactAssets("org-1", "artifact-1", [
    { kind: "prompt", path: "docs/thing.md", bytes: encode("# thing") },
  ])
  assert.deepEqual(deleteCalls, [])
})

test("replaceArtifactAssets rejects the whole set before storing anything when one member is invalid", async () => {
  reset()
  await assert.rejects(
    () =>
      replaceArtifactAssets("org-1", "artifact-1", [
        { kind: "schema", path: "schemas/a.json", bytes: encode("{}") },
        { kind: "schema", path: "../escape.json", bytes: encode("{}") },
      ]),
    (error) => error instanceof Response && error.status === 400
  )
  // The point of validating the set up front: a rejection must leave the
  // previously published set intact rather than half-replaced.
  assert.equal(putObjectCalls.length, 0)
  assert.equal(deleteCalls.length, 0)
})

test("replaceArtifactAssets enforces the agent's per-tool counts as a hard rejection", async () => {
  reset()
  const schemas = Array.from({ length: 33 }, (_, index) => ({
    kind: "schema",
    path: `schemas/op-${index}.json`,
    bytes: encode("{}"),
  }))

  await assertResponseRejection(
    () => replaceArtifactAssets("org-1", "artifact-1", schemas),
    400,
    /33 schema assets; the agent accepts at most 32/
  )
  assert.equal(putObjectCalls.length, 0, "no truncation -- nothing is stored at all")

  const prompts = Array.from({ length: 65 }, (_, index) => ({
    kind: "prompt",
    path: `prompts/op-${index}.md`,
    bytes: encode("# op"),
  }))
  await assertResponseRejection(
    () => replaceArtifactAssets("org-1", "artifact-1", prompts),
    400,
    /65 prompt assets; the agent accepts at most 64/
  )
})

test("replaceArtifactAssets accepts exactly the cap for each kind", async () => {
  reset()
  const assets = [
    ...Array.from({ length: 32 }, (_, index) => ({
      kind: "schema",
      path: `schemas/op-${index}.json`,
      bytes: encode("{}"),
    })),
    ...Array.from({ length: 64 }, (_, index) => ({
      kind: "prompt",
      path: `prompts/op-${index}.md`,
      bytes: encode("# op"),
    })),
  ]
  assert.equal((await replaceArtifactAssets("org-1", "artifact-1", assets)).length, 96)
})

test("replaceArtifactAssets rejects a duplicate (kind, path) rather than silently collapsing it", async () => {
  reset()
  await assert.rejects(
    () =>
      replaceArtifactAssets("org-1", "artifact-1", [
        { kind: "schema", path: "schemas/a.json", bytes: encode("{}") },
        { kind: "schema", path: "schemas/a.json", bytes: encode('{"other":1}') },
      ]),
    (error) => error instanceof Response && error.status === 400
  )
})

test("replaceArtifactAssets with an empty set clears every stored asset", async () => {
  reset()
  existingAssets = [{ id: "old-1", kind: "schema", path: "schemas/a.json", storageKey: "k1" }]
  assert.deepEqual(await replaceArtifactAssets("org-1", "artifact-1", []), [])
  assert.deepEqual(deleteCalls, ["old-1"])
})

test("getArtifactAssetMetadata returns the recorded integrity metadata, or 404s", async () => {
  reset()
  existingAssets = [
    {
      id: "asset-1",
      kind: "schema",
      path: "schemas/a.json",
      storageKey: "k1",
      sha256: "a".repeat(64),
      sizeBytes: 2,
    },
  ]

  const asset = await getArtifactAssetMetadata("org-1", "artifact-1", "schema", "schemas/a.json")
  assert.equal(asset.sizeBytes, 2)
  assert.equal(asset.sha256, "a".repeat(64))

  await assert.rejects(
    () => getArtifactAssetMetadata("org-1", "artifact-1", "schema", "schemas/missing.json"),
    (error) => error instanceof Response && error.status === 404
  )
})

test("deleteArtifactAsset removes the row then the storage object, and 404s when there is none", async () => {
  reset()
  existingAssets = [{ id: "asset-1", kind: "prompt", path: "prompts/a.md", storageKey: "k1" }]

  await deleteArtifactAsset("org-1", "artifact-1", "prompt", "prompts/a.md")
  assert.deepEqual(deleteCalls, ["asset-1"])
  assert.deepEqual(deleteObjectCalls, ["k1"])

  await assert.rejects(
    () => deleteArtifactAsset("org-1", "artifact-1", "prompt", "prompts/a.md"),
    (error) => error instanceof Response && error.status === 404
  )
})

test("a storage deletion failure does not fail the request that removed the row", async () => {
  // The row is the source of truth for what is published; an orphaned object
  // is waste, not a correctness problem, and must not resurrect a deleted asset.
  reset()
  existingAssets = [{ id: "asset-1", kind: "prompt", path: "prompts/a.md", storageKey: "k1" }]
  deleteObjectThrows = true

  await deleteArtifactAsset("org-1", "artifact-1", "prompt", "prompts/a.md")
  assert.deepEqual(deleteCalls, ["asset-1"])
})
