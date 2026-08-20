import assert from "node:assert/strict"
import { mock, test } from "node:test"

import { zipSync, strToU8 } from "fflate"

let metadataThrows = null
let storedZip = new Uint8Array()
const metadataCalls = []
const objectReads = []

mock.module("@/lib/auth/org-context", {
  namedExports: {
    requireActiveOrganization: async () => ({
      organizationId: "org-1",
      userId: "user-1",
    }),
  },
})

mock.module("@/lib/http/api", {
  namedExports: {
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 500 })
    },
  },
})

// Only the metadata lookup is faked: the listing itself runs against the real
// bundle.ts reader, so these tests fail if the zip parser stops agreeing with
// archives fflate produces.
mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    getArtifactContentMetadata: async (organizationId, id, kind) => {
      metadataCalls.push({ organizationId, id, kind })
      if (metadataThrows) throw metadataThrows
      return { storageKey: `key/${id}/${kind}`, sizeBytes: storedZip.length }
    },
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    getObjectBytes: async (key) => {
      objectReads.push(key)
      return storedZip
    },
  },
})

const { GET } = await import("./route.ts")

function reset() {
  metadataThrows = null
  storedZip = new Uint8Array()
  metadataCalls.length = 0
  objectReads.length = 0
}

const params = { params: Promise.resolve({ id: "artifact-1" }) }

test("lists the files inside the stored package, sorted by path", async () => {
  reset()
  storedZip = zipSync({
    "manifest.toml": strToU8("id = 'demo'"),
    "demo.wasm": new Uint8Array([0, 97, 115, 109]),
    "schemas/input.v1.json": strToU8("{}"),
  })

  const response = await GET(new Request("http://hub.test/entries"), params)
  assert.equal(response.status, 200)

  const body = await response.json()
  assert.deepEqual(
    body.entries.map((entry) => entry.path),
    ["demo.wasm", "manifest.toml", "schemas/input.v1.json"]
  )
  // Sizes are the uncompressed ones, which is what the reader is being shown.
  assert.equal(body.entries[0].sizeBytes, 4)
  assert.deepEqual(metadataCalls, [
    { organizationId: "org-1", id: "artifact-1", kind: "bundle_zip" },
  ])
  assert.deepEqual(objectReads, ["key/artifact-1/bundle_zip"])
})

test("drops directory records, which the view rebuilds from the paths anyway", async () => {
  reset()
  // fflate writes no directory entries of its own, so one is appended by
  // hand -- real archives from `zip`/Finder do carry them.
  storedZip = zipSync({
    "schemas/": new Uint8Array(),
    "schemas/input.v1.json": strToU8("{}"),
  })

  const response = await GET(new Request("http://hub.test/entries"), params)
  const body = await response.json()

  assert.deepEqual(
    body.entries.map((entry) => entry.path),
    ["schemas/input.v1.json"]
  )
})

test("answers the content lookup's 404 when no package is stored", async () => {
  reset()
  metadataThrows = new Response("Content not found", { status: 404 })

  const response = await GET(new Request("http://hub.test/entries"), params)

  assert.equal(response.status, 404)
  // Nothing was read from storage: there was no object to read.
  assert.deepEqual(objectReads, [])
})
