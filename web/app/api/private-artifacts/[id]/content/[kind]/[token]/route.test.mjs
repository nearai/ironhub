import assert from "node:assert/strict"
import { mock, test } from "node:test"

let verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
let verifyThrows = null
let metadataResult = {
  storageKey: "private-artifacts/org-1/artifact-1/wasm",
  sizeBytes: 42,
}
let presignedUrl = "http://localhost:8333/ironhub/private-artifacts/org-1/artifact-1/wasm?X-Amz-Signature=abc"

mock.module("@/lib/http/api", {
  namedExports: {
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 500 })
    },
  },
})

mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    getArtifactContentMetadata: async () => {
      if (!metadataResult) {
        throw new Response("Content not found", { status: 404 })
      }
      return metadataResult
    },
    parseContentKind: (value) => value,
  },
})

mock.module("@/lib/private-artifacts/token", {
  namedExports: {
    verifyArtifactToken: () => {
      if (verifyThrows) throw verifyThrows
      return verifyResult
    },
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    getPresignedDownloadUrl: async (key, ttl) => {
      assert.ok(ttl <= 300, "presigned TTL must be capped at 5 minutes")
      return presignedUrl
    },
  },
})

const { GET } = await import("./route.ts")

function makeParams(overrides = {}) {
  return {
    params: Promise.resolve({
      id: "artifact-1",
      kind: "wasm",
      token: "v1.token",
      ...overrides,
    }),
  }
}

test("valid token redirects (302) to a presigned URL with no-store", async () => {
  verifyThrows = null
  verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/wasm", sizeBytes: 42 }

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 302)
  assert.equal(response.headers.get("Location"), presignedUrl)
  assert.equal(response.headers.get("Cache-Control"), "no-store")
})

test("token scoped to a different artifact is rejected", async () => {
  verifyThrows = null
  verifyResult = { organizationId: "org-1", artifactId: "other-artifact" }

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 403)
})

test("invalid/expired token surfaces the token error status", async () => {
  verifyThrows = new Response("Invalid or expired artifact token", { status: 403 })

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 403)
})

test("missing content metadata surfaces 404 without presigning", async () => {
  verifyThrows = null
  verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
  metadataResult = null

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 404)
})
