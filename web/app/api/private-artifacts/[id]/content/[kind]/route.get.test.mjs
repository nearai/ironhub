import assert from "node:assert/strict"
import { Readable } from "node:stream"
import { mock, test } from "node:test"

// Separate file from route.test.mjs (which covers PUT) so this file's
// mock.module registrations for content/storage helpers don't collide with
// the PUT test file's narrower mocks of the same specifiers.

let metadataResult = null
let metadataError = null
let objectStreamImpl = async () => new Uint8Array([1, 2, 3, 4])

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
    getObjectStream: async (key) => objectStreamImpl(key),
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
  objectStreamImpl = async () => new Uint8Array([1, 2, 3, 4])

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8")
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.ok(response.body)
})

// The `stream instanceof Readable` branch is the one that actually runs
// against real S3-compatible storage in prod/dev (the SDK's default Node
// request handler returns a Node Readable, not a Web ReadableStream or
// Blob) -- exercise it with a real Readable rather than only the Uint8Array
// stand-in above, and check the bytes it produces are the ones sent.
test("streams a real Node Readable's bytes through to the response body", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/skill_md", sizeBytes: 11 }
  objectStreamImpl = async () => Readable.from([Buffer.from("hello world")])

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 200)
  assert.equal(await response.text(), "hello world")
})

// content.ts:63-72's row can point at a storage key that no longer has an
// object behind it (deleted out of band, ...). getObjectStream throws a
// plain Error for that; the route must not let handleApiError turn it into
// a 500 -- from the caller's side "the object is gone" and "there was
// never a content row" both mean "there is nothing to read here".
test("404s (not 500) when the content row exists but the storage object is missing", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/skill_md", sizeBytes: 42 }
  objectStreamImpl = async () => {
    throw new Error("Object not found: private-artifacts/org-1/artifact-1/skill_md")
  }

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 404)
})

test("404s when the SDK itself reports NoSuchKey", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/skill_md", sizeBytes: 42 }
  objectStreamImpl = async () => {
    const err = new Error("The specified key does not exist.")
    err.name = "NoSuchKey"
    err.$metadata = { httpStatusCode: 404 }
    throw err
  }

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 404)
})

// NB1 regression: a real infrastructure failure (timeout, throttling,
// expired credentials, a misconfigured bucket, ...) must NOT be answered
// as 404. The owner-facing client maps 404 to "nothing is stored yet,
// safe to save a fresh file" -- mapping a transient storage failure to
// 404 would tell the owner their real content doesn't exist and invite
// them to overwrite it with a near-empty one.
test("500s (not 404) when getObjectStream fails for a reason other than a missing object", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/skill_md", sizeBytes: 42 }
  objectStreamImpl = async () => {
    const err = new Error("Connection timed out")
    err.name = "TimeoutError"
    throw err
  }

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 500)
})

test("500s (not 404) for a 503 SlowDown throttling error", async () => {
  metadataError = null
  metadataResult = { storageKey: "private-artifacts/org-1/artifact-1/skill_md", sizeBytes: 42 }
  objectStreamImpl = async () => {
    const err = new Error("Please reduce your request rate.")
    err.name = "SlowDown"
    err.$metadata = { httpStatusCode: 503 }
    throw err
  }

  const response = await GET(new Request("http://localhost/x"), makeParams("skill_md"))

  assert.equal(response.status, 500)
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
