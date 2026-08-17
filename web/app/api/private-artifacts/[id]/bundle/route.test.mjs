import assert from "node:assert/strict"
import { mock, test } from "node:test"

let sameOriginThrows = null
let getArtifactResult = { id: "artifact-1", type: "tool" }
let getArtifactThrows = null
let inspectThrows = null
let inspectResult = {
  wasmPath: "wasm/firecrawl.wasm",
  capabilitiesPath: "firecrawl-tool.capabilities.json",
}
const storeCalls = []
const readCalls = []

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

mock.module("@/lib/private-artifacts/bundle", {
  namedExports: {
    inspectExtensionBundle: () => {
      if (inspectThrows) throw inspectThrows
      return inspectResult
    },
    readBundleFile: (zip, path) => {
      readCalls.push(path)
      return new TextEncoder().encode(`bytes-for:${path}`)
    },
  },
})

mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    storeArtifactContent: async (organizationId, id, kind, bytes) => {
      storeCalls.push({ organizationId, id, kind, size: bytes.length })
      return { kind, sha256: `sha-${kind}`, sizeBytes: bytes.length }
    },
  },
})

mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    getPrivateArtifact: async () => {
      if (getArtifactThrows) throw getArtifactThrows
      return getArtifactResult
    },
  },
})

const { PUT } = await import("./route.ts")

function makeParams(id = "artifact-1") {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body = new Uint8Array([1, 2, 3])) {
  return new Request("http://localhost/x", { method: "PUT", body })
}

test("stores wasm, capabilities, manifest_toml, and bundle_zip in that order", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  inspectThrows = null
  storeCalls.length = 0
  readCalls.length = 0

  const response = await PUT(makeRequest(), makeParams())
  assert.equal(response.status, 201)

  const json = await response.json()
  assert.deepEqual(
    json.content.map((c) => c.kind),
    ["wasm", "capabilities", "manifest_toml", "bundle_zip"]
  )
  assert.deepEqual(
    storeCalls.map((c) => c.kind),
    ["wasm", "capabilities", "manifest_toml", "bundle_zip"]
  )
  assert.deepEqual(readCalls, [
    "wasm/firecrawl.wasm",
    "firecrawl-tool.capabilities.json",
    "manifest.toml",
  ])
})

test("re-validates the archive from scratch and rejects if invalid", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  inspectThrows = new Response("Zip is missing manifest.toml at its root", { status: 400 })
  storeCalls.length = 0

  const response = await PUT(makeRequest(), makeParams())
  assert.equal(response.status, 400)
  assert.equal(storeCalls.length, 0)
})

test("rejects a bundle upload for a non-tool artifact with 409", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "skill" }
  inspectThrows = null
  storeCalls.length = 0

  const response = await PUT(makeRequest(), makeParams())
  assert.equal(response.status, 409)
  const text = await response.text()
  assert.equal(text, "Bundle upload is only supported for tools")
  assert.equal(storeCalls.length, 0)
})

test("returns 404 for an artifact outside the caller's active organization", async () => {
  sameOriginThrows = null
  getArtifactThrows = new Response("Artifact not found", { status: 404 })
  inspectThrows = null
  storeCalls.length = 0

  const response = await PUT(makeRequest(), makeParams("other-org-artifact"))
  assert.equal(response.status, 404)
  assert.equal(storeCalls.length, 0)
})

test("rejects cross-origin requests via the same-origin guard", async () => {
  sameOriginThrows = new Error("Cross-origin request blocked.")
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  inspectThrows = null
  storeCalls.length = 0

  const response = await PUT(makeRequest(), makeParams())
  assert.equal(response.status, 400)
  assert.equal(storeCalls.length, 0)
})
