import assert from "node:assert/strict"
import { mock, test } from "node:test"

let sameOriginThrows = null
const storeCalls = []

mock.module("@/lib/auth/org-context", {
  namedExports: {
    requireActiveOrganization: async () => ({ organizationId: "org-1", userId: "user-1" }),
  },
})

mock.module("@/lib/http/api", {
  namedExports: {
    assertSameOriginRequest: () => {
      if (sameOriginThrows) throw sameOriginThrows
    },
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 400 })
    },
  },
})

// Import the real per-kind limit table (and its formatter) rather than
// duplicating the numbers here -- a hand-copied table would silently drift
// from design.md D3 if content.ts's limits ever changed without this test
// file being touched.
const {
  CONTENT_MEDIA_TYPES,
  MAX_CONTENT_BYTES_BY_KIND,
  REDIRECT_CONTENT_KINDS,
  describeLimit: realDescribeLimit,
} = await import("@/lib/private-artifacts/content.ts")

mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    MAX_CONTENT_BYTES_BY_KIND,
    describeLimit: realDescribeLimit,
    // route.ts's GET handler (exercised in route.get.test.mjs) imports these
    // too. `mock.module` replaces the whole module for every importer, so an
    // export omitted here is a hard link error even for handlers this file
    // never calls. They come from the real module rather than being
    // hand-written: a partial CONTENT_MEDIA_TYPES literal would have left
    // manifest_toml and bundle_zip undefined.
    CONTENT_MEDIA_TYPES,
    REDIRECT_CONTENT_KINDS,
    getArtifactContentMetadata: async () => {
      throw new Error("not used by the PUT tests in this file")
    },
    parseContentKind: (value) => {
      if (!Object.keys(MAX_CONTENT_BYTES_BY_KIND).includes(value)) {
        throw new Response(`Invalid content kind: ${value}`, { status: 400 })
      }
      return value
    },
    storeArtifactContent: async (organizationId, id, kind, bytes) => {
      storeCalls.push({ organizationId, id, kind, size: bytes.length })
      return { kind, sha256: "deadbeef", sizeBytes: bytes.length }
    },
  },
})

const { PUT } = await import("./route.ts")

function makeParams(kind = "wasm") {
  return { params: Promise.resolve({ id: "artifact-1", kind }) }
}

test("uploads content and returns 201 with content metadata", async () => {
  sameOriginThrows = null
  storeCalls.length = 0
  const body = new Uint8Array([1, 2, 3, 4])
  const request = new Request("http://localhost/x", { method: "PUT", body })

  const response = await PUT(request, makeParams())
  const json = await response.json()

  assert.equal(response.status, 201)
  assert.equal(json.content.sizeBytes, 4)
  assert.equal(storeCalls.length, 1)
  assert.equal(storeCalls[0].kind, "wasm")
})

test("rejects an empty body with 400", async () => {
  sameOriginThrows = null
  const request = new Request("http://localhost/x", { method: "PUT", body: new Uint8Array([]) })

  const response = await PUT(request, makeParams())
  assert.equal(response.status, 400)
})

test("rejects a wasm body over the agent's 16MB limit with 413", async () => {
  sameOriginThrows = null
  const oversized = new Uint8Array(16 * 1024 * 1024 + 1)
  const request = new Request("http://localhost/x", { method: "PUT", body: oversized })

  const response = await PUT(request, makeParams())
  assert.equal(response.status, 413)
  assert.match(await response.text(), /16MB/)
})

test("accepts a 12MB wasm body, which the old 5MB cap rejected for no reason the agent shares", async () => {
  sameOriginThrows = null
  storeCalls.length = 0
  const body = new Uint8Array(12 * 1024 * 1024)
  const request = new Request("http://localhost/x", { method: "PUT", body })

  const response = await PUT(request, makeParams())
  assert.equal(response.status, 201)
  assert.equal(storeCalls.length, 1)
})

test("rejects a skill_md body over the agent's 1MB limit with 413", async () => {
  sameOriginThrows = null
  // 5MB used to upload cleanly here and then fail at install with the agent's
  // own `artifact exceeds 1048576 byte cap` (design.md D7).
  const oversized = new Uint8Array(1024 * 1024 + 1)
  const request = new Request("http://localhost/x", { method: "PUT", body: oversized })

  const response = await PUT(request, makeParams("skill_md"))
  assert.equal(response.status, 413)
  assert.match(await response.text(), /1MB/)
})

test("rejects a manifest_toml body over its 256KB limit with 413", async () => {
  sameOriginThrows = null
  const oversized = new Uint8Array(256 * 1024 + 1)
  const request = new Request("http://localhost/x", { method: "PUT", body: oversized })

  const response = await PUT(request, makeParams("manifest_toml"))
  assert.equal(response.status, 413)
  const text = await response.text()
  assert.match(text, /256KB/)
})

test("accepts a manifest_toml body within its 256KB limit", async () => {
  sameOriginThrows = null
  storeCalls.length = 0
  const body = new Uint8Array(1024)
  const request = new Request("http://localhost/x", { method: "PUT", body })

  const response = await PUT(request, makeParams("manifest_toml"))
  assert.equal(response.status, 201)
  assert.equal(storeCalls[0].kind, "manifest_toml")
})

test("rejects an invalid content kind with 400", async () => {
  sameOriginThrows = null
  const request = new Request("http://localhost/x", { method: "PUT", body: new Uint8Array([1]) })

  const response = await PUT(request, makeParams("bogus"))
  assert.equal(response.status, 400)
})

test("rejects cross-origin requests via the same-origin guard", async () => {
  sameOriginThrows = new Error("Cross-origin request blocked.")
  const request = new Request("http://localhost/x", { method: "PUT", body: new Uint8Array([1]) })

  const response = await PUT(request, makeParams())
  assert.equal(response.status, 400)
})
