import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { Readable } from "node:stream"
import { mock, test } from "node:test"

// The fixture bytes for each kind, standing in for what object storage holds.
// Non-ASCII and a NUL in the wasm case on purpose: the relay must be a byte
// pipe, and a stray text decode would corrupt exactly this.
const STORED = {
  wasm: new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0xff]),
  manifest_toml: new TextEncoder().encode('id = "tool"\ndescription = "café"\n'),
  skill_md: new TextEncoder().encode("# Skill\n\nBody.\n"),
  capabilities: new TextEncoder().encode('{"capabilities":[]}'),
}

let verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
let verifyThrows = null
let loadoutMembers = []
let metadataResult = null
let streamedKeys = []
let streamThrows = null

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
    CONTENT_MEDIA_TYPES: {
      skill_md: "text/markdown; charset=utf-8",
      wasm: "application/wasm",
      capabilities: "application/json",
      manifest_toml: "application/toml; charset=utf-8",
      bundle_zip: "application/zip",
      soul_md: "text/markdown; charset=utf-8",
      readme_md: "text/markdown; charset=utf-8",
    },
    // Mirrors the real set rather than aliasing it: this file mocks the whole
    // content module, so an import the mock omits arrives `undefined` and the
    // route throws on it instead of testing it.
    HUB_ONLY_CONTENT_KINDS: new Set(["readme_md"]),
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
    // Mirrors the real rule rather than stubbing it out, so the route's
    // ordering (authorize before storage) is still what is under test here
    // while token.test.mjs owns the rule itself. `loadoutMembers` stands in
    // for the member table.
    authorizeArtifactRead: async (claims, id) => {
      const authorized = claims.loadoutId
        ? loadoutMembers.includes(id)
        : claims.artifactId === id
      if (!authorized) {
        throw new Response("Token does not match artifact", { status: 403 })
      }
    },
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    getObjectStream: async (key) => {
      streamedKeys.push(key)
      if (streamThrows) throw streamThrows
      const kind = key.split("/").pop()
      return Readable.from([Buffer.from(STORED[kind])])
    },
    // Present so an accidental reintroduction of the redirect fails loudly
    // rather than passing a test that only checked the status code.
    getPresignedDownloadUrl: async () => {
      throw new Error(
        "the agent-facing route must never presign an object-store URL (C5)"
      )
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

function reset(kind = "wasm") {
  verifyThrows = null
  verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
  loadoutMembers = []
  metadataResult = {
    storageKey: `private-artifacts/org-1/artifact-1/${kind}`,
    sizeBytes: STORED[kind].length,
  }
  streamedKeys = []
  streamThrows = null
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

// --- Task 4.1 / 4.5 ---------------------------------------------------------

test("task 4.1: every kind is answered with 200 and the stored bytes, never a redirect", async () => {
  for (const kind of Object.keys(STORED)) {
    reset(kind)

    const response = await GET(new Request("http://localhost/x"), makeParams({ kind }))

    assert.equal(response.status, 200, `${kind} must not redirect`)
    assert.equal(response.headers.get("Location"), null)
    assert.deepEqual(
      new Uint8Array(await response.arrayBuffer()),
      STORED[kind],
      `${kind} body must be the stored bytes verbatim`
    )
  }
})

test("task 4.5: Content-Length and digest match what the manifest advertises", async () => {
  // The manifest advertises the *recorded* sizeBytes and sha256, and the agent
  // enforces both exactly (C6). Both numbers must therefore describe the body
  // this route produces.
  for (const kind of Object.keys(STORED)) {
    reset(kind)
    const advertisedSize = metadataResult.sizeBytes
    const advertisedSha = sha256(STORED[kind])

    const response = await GET(new Request("http://localhost/x"), makeParams({ kind }))
    const body = new Uint8Array(await response.arrayBuffer())

    assert.equal(response.headers.get("Content-Length"), String(advertisedSize))
    assert.equal(body.length, advertisedSize)
    assert.equal(sha256(body), advertisedSha)
  }
})

test("task 4.5: no object-storage host appears in the status line or any header", async () => {
  reset("wasm")

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.ok(response.status >= 200 && response.status < 300)
  for (const [name, value] of response.headers) {
    assert.doesNotMatch(
      value,
      /X-Amz-|localhost:8333|s3|amazonaws/i,
      `header ${name} leaks an object-storage detail: ${value}`
    )
  }
  assert.equal(response.headers.get("Content-Encoding"), null)
  assert.equal(response.headers.get("Cache-Control"), "no-store")
})

test("the content type is the kind's, not the object store's guess", async () => {
  reset("wasm")
  const response = await GET(new Request("http://localhost/x"), makeParams())
  assert.equal(response.headers.get("Content-Type"), "application/wasm")

  reset("manifest_toml")
  const toml = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "manifest_toml" })
  )
  assert.equal(toml.headers.get("Content-Type"), "application/toml; charset=utf-8")
})

// --- Task 4.3: capabilities stub -------------------------------------------

test("task 4.3: serves the capabilities stub when no capabilities row exists", async () => {
  reset("capabilities")
  metadataResult = null

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "capabilities" })
  )
  const body = new Uint8Array(await response.arrayBuffer())

  assert.equal(response.status, 200)
  assert.deepEqual(body, new TextEncoder().encode("{}"))
  // Exactly what the manifest builder advertises for the same URL.
  assert.equal(response.headers.get("Content-Length"), "2")
  assert.equal(
    sha256(body),
    "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
  )
  assert.equal(streamedKeys.length, 0, "the stub must not touch storage")
})

test("task 4.3: a stored capabilities row is served instead of the stub", async () => {
  reset("capabilities")

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "capabilities" })
  )

  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), STORED.capabilities)
})

test("the stub does not mask a missing row for any other kind", async () => {
  reset("wasm")
  metadataResult = null

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 404)
})

// --- Authorization and failure modes ----------------------------------------

test("token scoped to a different artifact is rejected before storage is touched", async () => {
  reset("wasm")
  verifyResult = { organizationId: "org-1", artifactId: "other-artifact" }

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 403)
  assert.equal(streamedKeys.length, 0)
})

test("task 6.2: a loadout-scoped token reads a member's content", async () => {
  reset("wasm")
  verifyResult = {
    organizationId: "org-1",
    artifactId: "loadout-1",
    loadoutId: "loadout-1",
  }
  loadoutMembers = ["artifact-1", "artifact-2"]

  const response = await GET(new Request("http://localhost/x"), makeParams({ token: "v1.loadout-token" }))

  assert.equal(response.status, 200)
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), STORED.wasm)
})

test("task 8.5: a loadout-scoped token is refused for an artifact that is not a member", async () => {
  reset("wasm")
  // Same organization, same still-valid token, artifact simply not in this
  // loadout. Authorizing against membership rather than against the token's
  // organization is what makes this a 403 (design.md -- "Token claims move
  // from an artifact to a loadout, with membership authorization").
  verifyResult = {
    organizationId: "org-1",
    artifactId: "loadout-1",
    loadoutId: "loadout-1",
  }
  loadoutMembers = ["artifact-2"]

  const response = await GET(new Request("http://localhost/x"), makeParams({ token: "v1.loadout-token" }))

  assert.equal(response.status, 403)
  assert.equal(streamedKeys.length, 0)
})

test("task 8.5: the capabilities stub is not a way around membership", async () => {
  reset("capabilities")
  // The stub answers a 404 from the metadata lookup, which happens *after*
  // authorization -- so a non-member must never reach it. A route that
  // authorized late would hand out a 200 here instead of a 403.
  metadataResult = null
  verifyResult = {
    organizationId: "org-1",
    artifactId: "loadout-1",
    loadoutId: "loadout-1",
  }
  loadoutMembers = ["artifact-2"]

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "capabilities", token: "v1.loadout-token" })
  )

  assert.equal(response.status, 403)
})

test("invalid/expired token surfaces the token error status", async () => {
  reset("wasm")
  verifyThrows = new Response("Invalid or expired artifact token", { status: 403 })

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 403)
})

test("an object that is recorded but gone from the bucket answers 404, not 500", async () => {
  reset("wasm")
  streamThrows = new Error("Object not found: private-artifacts/org-1/artifact-1/wasm")

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 404)
})

test("a real storage failure answers 500 rather than being read as an absence", async () => {
  reset("wasm")
  streamThrows = new Error("connection reset")

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 500)
})

// --- hub-only kinds ---------------------------------------------------------

test("a hub-only kind is refused on the agent-facing route", async () => {
  reset("skill_md")
  metadataResult = {
    storageKey: "private-artifacts/org-1/artifact-1/readme_md",
    sizeBytes: 4,
  }

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "readme_md" })
  )

  // 404, not 403: the document has no published existence to authorize
  // against. Asserted on the stream log too, because a route that refused
  // after fetching would still have read the object it must not serve.
  assert.equal(response.status, 404)
  assert.deepEqual(streamedKeys, [])
})

test("the refusal does not depend on the token being valid", async () => {
  reset("skill_md")
  // Ordered before token verification on purpose: a hub-only kind is refused
  // for every caller, so a valid install token is never the thing standing
  // between an agent and a soul's README.
  verifyThrows = new Response("Invalid or expired artifact token", {
    status: 403,
  })

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "readme_md" })
  )

  assert.equal(response.status, 404)
})

test("a published kind on the same artifact still relays", async () => {
  reset("skill_md")

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "skill_md" })
  )

  assert.equal(response.status, 200)
  assert.equal(
    sha256(new Uint8Array(await response.arrayBuffer())),
    sha256(STORED.skill_md)
  )
})
