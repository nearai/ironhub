import assert from "node:assert/strict"
import { mock, test } from "node:test"

let requireActiveOrgThrows = null
let sameOriginThrows = null
let inspectThrows = null
let inspectCallCount = 0
const inspectResult = {
  manifest: {
    id: "firecrawl",
    name: "Firecrawl",
    version: "0.2.1",
    description: "Scrape the web.",
    trust: "third_party",
    runtimeKind: "wasm",
    runtimeModule: "wasm/firecrawl.wasm",
  },
  wasmPath: "wasm/firecrawl.wasm",
  capabilitiesPath: "firecrawl-tool.capabilities.json",
  entryNames: ["manifest.toml", "wasm/firecrawl.wasm", "firecrawl-tool.capabilities.json"],
  schemaFiles: ["schemas/scrape.json"],
  promptFiles: ["prompts/scrape.md"],
  totalUncompressedBytes: 4096,
}

mock.module("@/lib/auth/org-context", {
  namedExports: {
    requireActiveOrganization: async () => {
      if (requireActiveOrgThrows) throw requireActiveOrgThrows
      return { organizationId: "org-1", userId: "user-1" }
    },
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
      inspectCallCount++
      if (inspectThrows) throw inspectThrows
      return inspectResult
    },
  },
})

const { POST } = await import("./route.ts")

function makeRequest(body = new Uint8Array([1, 2, 3])) {
  return new Request("http://localhost/api/private-artifacts/bundle/inspect", {
    method: "POST",
    body,
  })
}

test("returns the manifest/files/size payload for a valid archive, persisting nothing", async () => {
  requireActiveOrgThrows = null
  sameOriginThrows = null
  inspectThrows = null

  const response = await POST(makeRequest())
  assert.equal(response.status, 200)

  const json = await response.json()
  assert.deepEqual(json.manifest, inspectResult.manifest)
  assert.deepEqual(json.files, {
    wasm: "wasm/firecrawl.wasm",
    capabilities: "firecrawl-tool.capabilities.json",
    schemas: ["schemas/scrape.json"],
    prompts: ["prompts/scrape.md"],
  })
  assert.equal(json.totalUncompressedBytes, 4096)
})

test("rejects an invalid archive with the validator's 400 and reason", async () => {
  requireActiveOrgThrows = null
  sameOriginThrows = null
  inspectThrows = new Response("Upload must be a .zip archive", { status: 400 })

  const response = await POST(makeRequest())
  assert.equal(response.status, 400)
  const text = await response.text()
  assert.equal(text, "Upload must be a .zip archive")
})

test("denies an unauthenticated request without reading the archive", async () => {
  requireActiveOrgThrows = new Response("Unauthorized", { status: 401 })
  sameOriginThrows = null
  inspectThrows = null
  inspectCallCount = 0

  const response = await POST(makeRequest())
  assert.equal(response.status, 401)
  assert.equal(inspectCallCount, 0)
})
