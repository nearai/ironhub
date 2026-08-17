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

const MAX_CONTENT_BYTES_BY_KIND = {
  skill_md: 5 * 1024 * 1024,
  wasm: 5 * 1024 * 1024,
  capabilities: 5 * 1024 * 1024,
  manifest_toml: 256 * 1024,
  bundle_zip: 25 * 1024 * 1024,
}

mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    MAX_CONTENT_BYTES_BY_KIND,
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

test("rejects a body over the 5MB limit with 413", async () => {
  sameOriginThrows = null
  const oversized = new Uint8Array(5 * 1024 * 1024 + 1)
  const request = new Request("http://localhost/x", { method: "PUT", body: oversized })

  const response = await PUT(request, makeParams())
  assert.equal(response.status, 413)
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
