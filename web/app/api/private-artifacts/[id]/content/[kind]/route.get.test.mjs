import assert from "node:assert/strict"
import { mock, test } from "node:test"

// Separate file from route.test.mjs (which covers PUT) so this file's
// mock.module registrations for content/storage helpers don't collide with
// the PUT test file's narrower mocks of the same specifiers.

let metadataResult = null
let metadataError = null

mock.module("@/lib/auth/org-context", {
  namedExports: {
    requireActiveOrganization: async () => ({ organizationId: "org-1", userId: "user-1" }),
  },
})

mock.module("@/lib/http/api", {
  namedExports: {
    assertSameOriginRequest: () => {},
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 400 })
    },
  },
})

mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    CONTENT_MEDIA_TYPES: {
      skill_md: "text/markdown; charset=utf-8",
      wasm: "application/wasm",
      capabilities: "application/json",
    },
    parseContentKind: (value) => {
      if (!["wasm", "capabilities", "skill_md"].includes(value)) {
        throw new Response(`Invalid content kind: ${value}`, { status: 400 })
      }
      return value
    },
    getArtifactContentMetadata: async () => {
      if (metadataError) throw metadataError
      return metadataResult
    },
    // Unused by GET, present so importing this module doesn't fail if PUT's
    // helpers are referenced from the same route module.
    storeArtifactContent: async () => {
      throw new Error("not used in these tests")
    },
  },
})

mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    deletePrivateArtifactContentRow: async () => {
      throw new Error("not used in these tests")
    },
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    getObjectStream: async () => new Uint8Array([1, 2, 3, 4]),
    getPresignedDownloadUrl: async (storageKey, ttlSeconds) =>
      `https://storage.test/${storageKey}?ttl=${ttlSeconds}`,
    deleteObject: async () => {},
  },
})

const { GET } = await import("./route.ts")

function makeParams(kind = "skill_md", id = "artifact-1") {
  return { params: Promise.resolve({ id, kind }) }
}

test("streams a text kind inline with the kind's media type and no-store caching", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/skill_md", sizeBytes: 42 }

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8")
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.ok(response.body)
})

test("redirects a binary kind to a presigned URL with a TTL of at most 300s", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/wasm", sizeBytes: 100 }

  const response = await GET(new Request("http://localhost/x"), makeParams("wasm"))

  assert.equal(response.status, 302)
  assert.equal(response.headers.get("cache-control"), "no-store")
  const location = response.headers.get("location")
  assert.ok(location)
  const ttl = Number(new URL(location).searchParams.get("ttl"))
  assert.ok(ttl <= 300)
})

test("404s without leaking existence when the content row is missing", async () => {
  metadataError = new Response("Content not found", { status: 404 })
  metadataResult = null

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 404)
})

test("404s the same way for a cross-org read (no distinguishable error)", async () => {
  // getArtifactContentMetadata scopes its lookup by organizationId, so an
  // artifact belonging to a different org surfaces as the identical 404 as
  // a genuinely missing content row -- that's the no-existence-leak
  // behaviour design.md D4 requires.
  metadataError = new Response("Content not found", { status: 404 })
  metadataResult = null

  const response = await GET(new Request("http://localhost/x"), makeParams("capabilities"))

  assert.equal(response.status, 404)
})

test("rejects an invalid content kind with 400", async () => {
  const response = await GET(new Request("http://localhost/x"), makeParams("bogus"))
  assert.equal(response.status, 400)
})
