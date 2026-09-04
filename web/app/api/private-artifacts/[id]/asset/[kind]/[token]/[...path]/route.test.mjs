import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { Readable } from "node:stream"
import { mock, test } from "node:test"

const SCHEMA_PATH = "schemas/firecrawl/scrape.input.v1.json"
const PROMPT_PATH = "prompts/firecrawl/scrape.md"

const STORED = {
  [`schema ${SCHEMA_PATH}`]: new TextEncoder().encode(
    '{"type":"object","title":"café"}'
  ),
  [`prompt ${PROMPT_PATH}`]: new TextEncoder().encode("# Scrape\n\nUse it.\n"),
}

let verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
let verifyThrows = null
let loadoutMembers = []
let missingAsset = false
let lookups = []
let streamedKeys = []

mock.module("@/lib/http/api", {
  namedExports: {
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 500 })
    },
  },
})

mock.module("@/lib/private-artifacts/assets", {
  namedExports: {
    ASSET_MEDIA_TYPES: {
      schema: "application/json",
      prompt: "text/markdown; charset=utf-8",
    },
    parseAssetKind: (value) => {
      if (value !== "schema" && value !== "prompt") {
        throw new Response(`Invalid asset kind: ${value}`, { status: 400 })
      }
      return value
    },
    getArtifactAssetMetadata: async (organizationId, artifactId, kind, path) => {
      lookups.push({ organizationId, artifactId, kind, path })
      const bytes = STORED[`${kind} ${path}`]
      if (missingAsset || !bytes) {
        throw new Response("Asset not found", { status: 404 })
      }
      return {
        storageKey: `private-artifacts/${organizationId}/${artifactId}/assets/${kind}/${path}`,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.length,
      }
    },
  },
})

mock.module("@/lib/private-artifacts/token", {
  namedExports: {
    verifyArtifactToken: () => {
      if (verifyThrows) throw verifyThrows
      return verifyResult
    },
    // Mirrors the real rule (token.test.mjs owns the rule itself): the
    // token's own artifact when the claims carry no loadout scope, a member
    // of that one loadout when they do.
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
      const [kind, ...rest] = key.split("/assets/")[1].split("/")
      return Readable.from([Buffer.from(STORED[`${kind} ${rest.join("/")}`])])
    },
    getPresignedDownloadUrl: async () => {
      throw new Error(
        "the agent-facing asset route must never presign an object-store URL (C5)"
      )
    },
  },
})

const { GET } = await import("./route.ts")

function makeParams(overrides = {}) {
  return {
    params: Promise.resolve({
      id: "artifact-1",
      kind: "schema",
      token: "v1.token",
      path: SCHEMA_PATH.split("/"),
      ...overrides,
    }),
  }
}

function reset() {
  verifyThrows = null
  verifyResult = { organizationId: "org-1", artifactId: "artifact-1" }
  loadoutMembers = []
  missingAsset = false
  lookups = []
  streamedKeys = []
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

test("task 4.2: serves a declared schema asset by its path, as bytes", async () => {
  reset()

  const response = await GET(new Request("http://localhost/x"), makeParams())
  const body = new Uint8Array(await response.arrayBuffer())

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Location"), null)
  assert.deepEqual(body, STORED[`schema ${SCHEMA_PATH}`])
  assert.equal(response.headers.get("Content-Type"), "application/json")
})

test("task 4.2: serves a declared prompt asset from the prompt namespace", async () => {
  reset()

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "prompt", path: PROMPT_PATH.split("/") })
  )

  assert.equal(response.status, 200)
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    STORED[`prompt ${PROMPT_PATH}`]
  )
  assert.equal(
    response.headers.get("Content-Type"),
    "text/markdown; charset=utf-8"
  )
})

test("task 4.2: the catch-all reassembles the declared path exactly", async () => {
  reset()

  await GET(new Request("http://localhost/x"), makeParams())

  // What the manifest published as the key is what gets looked up -- no
  // normalization step may sit between the two, or C9's set equality breaks
  // while every byte still downloads.
  assert.deepEqual(lookups, [
    {
      organizationId: "org-1",
      artifactId: "artifact-1",
      kind: "schema",
      path: SCHEMA_PATH,
    },
  ])
})

test("task 4.5: Content-Length and digest match what the manifest advertises", async () => {
  reset()
  const expected = STORED[`schema ${SCHEMA_PATH}`]

  const response = await GET(new Request("http://localhost/x"), makeParams())
  const body = new Uint8Array(await response.arrayBuffer())

  assert.equal(response.headers.get("Content-Length"), String(expected.length))
  assert.equal(body.length, expected.length)
  assert.equal(sha256(body), sha256(expected))
  assert.equal(response.headers.get("Content-Encoding"), null)
})

test("task 4.5: no object-storage host appears in any response header", async () => {
  reset()

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 200)
  for (const [name, value] of response.headers) {
    assert.doesNotMatch(
      value,
      /X-Amz-|localhost:8333|s3|amazonaws/i,
      `header ${name} leaks an object-storage detail: ${value}`
    )
  }
})

test("a traversal path is rejected by the grammar before any lookup", async () => {
  reset()

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ path: ["schemas", "..", "..", "wasm"] })
  )

  assert.equal(response.status, 400)
  assert.equal(lookups.length, 0)
  assert.equal(streamedKeys.length, 0)
})

test("an unknown asset kind is rejected", async () => {
  reset()

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ kind: "wasm" })
  )

  assert.equal(response.status, 400)
  assert.equal(lookups.length, 0)
})

test("token scoped to a different artifact is rejected before any lookup", async () => {
  reset()
  verifyResult = { organizationId: "org-1", artifactId: "other-artifact" }

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 403)
  assert.equal(lookups.length, 0)
})

test("invalid/expired token surfaces the token error status", async () => {
  reset()
  verifyThrows = new Response("Invalid or expired artifact token", { status: 403 })

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 403)
})

test("an asset that is not stored answers 404", async () => {
  reset()
  missingAsset = true

  const response = await GET(new Request("http://localhost/x"), makeParams())

  assert.equal(response.status, 404)
})

test("the rate limit accommodates a full install at both agent caps", async () => {
  reset()

  // C17: the agent downloads artifacts sequentially, one request per published
  // asset. A tool at 32 schemas + 64 prompts issues 96 requests through this
  // route for one install, so a budget below that would abort a legal install.
  for (let index = 0; index < 96; index += 1) {
    const response = await GET(
      new Request("http://localhost/x", { headers: { "x-real-ip": "10.0.0.1" } }),
      makeParams()
    )
    assert.equal(response.status, 200, `request ${index + 1} was throttled`)
  }
})

// --- Loadout-scoped tokens (tasks 6.2, 6.3, 8.5) -----------------------------

function loadoutClaims() {
  return {
    organizationId: "org-1",
    artifactId: "loadout-1",
    loadoutId: "loadout-1",
  }
}

test("task 6.2: a loadout-scoped token reads a member's asset", async () => {
  reset()
  verifyResult = loadoutClaims()
  loadoutMembers = ["artifact-1", "artifact-2"]

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ token: "v1.loadout-token" })
  )

  assert.equal(response.status, 200)
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    STORED[`schema ${SCHEMA_PATH}`]
  )
})

test("task 8.5: a loadout-scoped token is refused for a non-member's asset", async () => {
  reset()
  verifyResult = loadoutClaims()
  loadoutMembers = ["artifact-2"]

  const response = await GET(
    new Request("http://localhost/x"),
    makeParams({ token: "v1.loadout-token" })
  )

  assert.equal(response.status, 403)
  assert.equal(lookups.length, 0)
  assert.equal(streamedKeys.length, 0)
})

test("task 6.3: every member of a loadout gets the whole per-tool asset budget", async () => {
  reset()
  verifyResult = loadoutClaims()
  const members = ["member-a", "member-b", "member-c"]
  loadoutMembers = members

  // The cap this route is sized from is per *tool* (32 schemas + 64 prompts),
  // so three members at that cap is 288 requests on one token inside one
  // minute -- which a token-keyed budget refuses and a member-keyed one
  // serves. design.md: "Rate limits are keyed per member."
  let served = 0
  for (const member of members) {
    for (let index = 0; index < 96; index += 1) {
      const response = await GET(
        new Request("http://localhost/x", {
          headers: { "x-real-ip": "10.0.0.2" },
        }),
        makeParams({ id: member, token: "v1.loadout-token" })
      )
      assert.equal(
        response.status,
        200,
        `${member} request ${index + 1} was throttled`
      )
      served += 1
    }
  }

  assert.equal(served, 288)
})
