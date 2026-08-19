import assert from "node:assert/strict"
import { mock, test } from "node:test"

import { zipSync } from "fflate"

let authThrows = null
let sameOriginThrows = null

mock.module("@/lib/auth/org-context", {
  namedExports: {
    requireActiveOrganization: async () => {
      if (authThrows) throw authThrows
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

const { POST } = await import("./route.ts")

const encode = (text) => new TextEncoder().encode(text)

function validBundleFiles() {
  return {
    "manifest.toml": encode(
      [
        `schema_version = "reborn.extension_manifest.v3"`,
        `id = "test-tool"`,
        `name = "Test Tool"`,
        `version = "0.1.0"`,
        `description = "A test tool."`,
        `trust = "third_party"`,
        "",
        "[runtime]",
        `kind = "wasm"`,
        `module = "wasm/test.wasm"`,
        "",
        // The manifest must declare the assets it ships: inspect reports what
        // the manifest references, not what happens to sit under `schemas/`.
        "[[tools]]",
        `id = "test-tool.scrape"`,
        `description = "Scrape a page."`,
        `default_permission = "ask"`,
        `input_schema_ref = "schemas/test/scrape.input.v1.json"`,
        `prompt_doc_ref = "prompts/test/scrape.md"`,
        "",
      ].join("\n")
    ),
    "wasm/test.wasm": new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    "test-tool.capabilities.json": encode(JSON.stringify({ version: "0.1.0" })),
    "schemas/test/scrape.input.v1.json": encode("{}"),
    "prompts/test/scrape.md": encode("# scrape"),
  }
}

function makeRequest(body) {
  return new Request("http://localhost/api/private-artifacts/bundle/inspect", {
    method: "POST",
    body,
  })
}

test("inspects a valid bundle and returns the manifest/files payload without persisting", async () => {
  authThrows = null
  sameOriginThrows = null
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await POST(makeRequest(zip))
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.equal(json.manifest.id, "test-tool")
  assert.equal(json.manifest.runtimeModule, "wasm/test.wasm")
  assert.deepEqual(json.files, {
    wasm: "wasm/test.wasm",
    capabilities: "test-tool.capabilities.json",
    schemas: ["schemas/test/scrape.input.v1.json"],
    prompts: ["prompts/test/scrape.md"],
  })
  assert.ok(json.totalUncompressedBytes > 0)
})

test("inspects a bundle with no *.capabilities.json and reports files.capabilities as null", async () => {
  // design.md D3/D6: capabilities is optional, so an archive with none must
  // inspect cleanly rather than being rejected.
  authThrows = null
  sameOriginThrows = null
  const files = validBundleFiles()
  delete files["test-tool.capabilities.json"]
  const zip = zipSync(files, { level: 0 })

  const response = await POST(makeRequest(zip))
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.equal(json.files.capabilities, null)
})

test("rejects an archive with two *.capabilities.json files at its root with the exact D6 message", async () => {
  authThrows = null
  sameOriginThrows = null
  const files = validBundleFiles()
  files["other-tool.capabilities.json"] = encode(JSON.stringify({ version: "0.1.0" }))
  const zip = zipSync(files, { level: 0 })

  const response = await POST(makeRequest(zip))
  const text = await response.text()

  assert.equal(response.status, 400)
  assert.match(text, /^Zip must contain at most one \*\.capabilities\.json at its root \(found 2\)$/)
})

test("rejects an archive whose single capabilities file is not valid JSON", async () => {
  authThrows = null
  sameOriginThrows = null
  const files = validBundleFiles()
  files["test-tool.capabilities.json"] = encode("{ not json")
  const zip = zipSync(files, { level: 0 })

  const response = await POST(makeRequest(zip))
  const text = await response.text()

  assert.equal(response.status, 400)
  assert.match(text, /^test-tool\.capabilities\.json is not valid JSON$/)
})

test("rejects an invalid archive with the specific validation reason", async () => {
  authThrows = null
  sameOriginThrows = null
  const files = validBundleFiles()
  delete files["manifest.toml"]
  const zip = zipSync(files, { level: 0 })

  const response = await POST(makeRequest(zip))
  const text = await response.text()

  assert.equal(response.status, 400)
  assert.match(text, /Zip is missing manifest\.toml at its root/)
})

test("denies an unauthenticated request without reading the archive", async () => {
  authThrows = new Response("Unauthorized", { status: 401 })
  sameOriginThrows = null
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await POST(makeRequest(zip))

  assert.equal(response.status, 401)
})

test("rejects a cross-origin request via the same-origin guard", async () => {
  authThrows = null
  sameOriginThrows = new Error("Cross-origin request blocked.")
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await POST(makeRequest(zip))

  assert.equal(response.status, 400)
})
