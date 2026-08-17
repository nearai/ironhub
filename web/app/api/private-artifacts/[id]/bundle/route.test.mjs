import assert from "node:assert/strict"
import { mock, test } from "node:test"

import { zipSync } from "fflate"

let sameOriginThrows = null
let getArtifactResult = { id: "artifact-1", type: "tool" }
let getArtifactThrows = null
let overLimitKind = null
const storeCalls = []
const deleteCalls = []
// Simulates whether a `capabilities` row already exists in storage, so
// deleteArtifactContent's real "404 when nothing to delete" behavior can be
// exercised without a real Prisma/S3 backend.
let existingCapabilitiesRow = false

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

mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    getPrivateArtifact: async () => {
      if (getArtifactThrows) throw getArtifactThrows
      return getArtifactResult
    },
  },
})

// Mirrors content.ts's real guard shape (413, generic message) closely
// enough to prove the route's *translation* of that response into a
// file-named 400 -- the actual limit enforcement is covered separately in
// content.test.mjs against the real storeArtifactContent.
//
// This mock's namedExports MUST list every export route.ts actually imports
// from "@/lib/private-artifacts/content" -- node:test's mock.module replaces
// the whole module by resolved identity, so an import the route added later
// (deleteArtifactContent) silently fails to link if this list falls behind,
// crashing the entire file's module load rather than one test.
mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    storeArtifactContent: async (organizationId, id, kind, bytes) => {
      if (kind === overLimitKind) {
        throw new Response(`Content exceeds the 5MB limit for ${kind}`, {
          status: 413,
        })
      }
      storeCalls.push({ organizationId, id, kind, bytes })
      return { kind, sha256: `sha-${kind}`, sizeBytes: bytes.length }
    },
    deleteArtifactContent: async (organizationId, id, kind) => {
      deleteCalls.push({ organizationId, id, kind })
      if (kind === "capabilities" && !existingCapabilitiesRow) {
        throw new Response("Content not found", { status: 404 })
      }
      existingCapabilitiesRow = false
    },
  },
})

// inspectExtensionBundle / readBundleFile are the real implementation on
// purpose: the route re-validates from scratch and must never trust an
// earlier inspect call, so the test exercises real validation logic against
// an in-test zip rather than a mock.
const { PUT } = await import("./route.ts")

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
      ].join("\n")
    ),
    "wasm/test.wasm": new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    "test-tool.capabilities.json": encode(JSON.stringify({ version: "0.1.0" })),
  }
}

function makeParams(id = "artifact-1") {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body) {
  return new Request("http://localhost/api/private-artifacts/artifact-1/bundle", {
    method: "PUT",
    body,
  })
}

test("stores wasm, capabilities, manifest_toml, and bundle_zip in order for a tool", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  overLimitKind = null
  storeCalls.length = 0
  deleteCalls.length = 0
  existingCapabilitiesRow = false
  const files = validBundleFiles()
  const zip = zipSync(files, { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())
  const json = await response.json()

  assert.equal(response.status, 201)
  assert.deepEqual(
    json.content.map((c) => c.kind),
    ["wasm", "capabilities", "manifest_toml", "bundle_zip"]
  )
  assert.deepEqual(
    storeCalls.map((c) => c.kind),
    ["wasm", "capabilities", "manifest_toml", "bundle_zip"]
  )
  // A bundle that carries a capabilities file must never attempt to clear
  // one -- the store path and the clear path are mutually exclusive.
  assert.deepEqual(deleteCalls, [])
  assert.equal(storeCalls[3].bytes.length, zip.length) // bundle_zip stores the raw upload
  // The point of readBundleFile(zip, inspected.wasmPath) is that "wasm" gets
  // the bytes of the entry named by [runtime].module -- not merely a
  // same-sized or arbitrary entry. Storing the wrong file under the right
  // kind would pass a size/count-only assertion but ship a broken module.
  assert.deepEqual(Array.from(storeCalls[0].bytes), Array.from(files["wasm/test.wasm"]))
  assert.deepEqual(
    Array.from(storeCalls[1].bytes),
    Array.from(files["test-tool.capabilities.json"])
  )
  assert.deepEqual(Array.from(storeCalls[2].bytes), Array.from(files["manifest.toml"]))
})

test("stores wasm, manifest_toml, and bundle_zip (no capabilities row) for a first-time bundle with no *.capabilities.json", async () => {
  // design.md D3/D6: capabilities is optional. An archive without one is a
  // fully valid upload and must write no `capabilities` content row. There
  // was never a row to begin with, so the clear attempt 404s and that must
  // be swallowed, not surfaced as an error.
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  overLimitKind = null
  storeCalls.length = 0
  deleteCalls.length = 0
  existingCapabilitiesRow = false
  const files = validBundleFiles()
  delete files["test-tool.capabilities.json"]
  const zip = zipSync(files, { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())
  const json = await response.json()

  assert.equal(response.status, 201)
  assert.deepEqual(
    json.content.map((c) => c.kind),
    ["wasm", "manifest_toml", "bundle_zip"]
  )
  assert.deepEqual(
    storeCalls.map((c) => c.kind),
    ["wasm", "manifest_toml", "bundle_zip"]
  )
  assert.ok(!storeCalls.some((c) => c.kind === "capabilities"))
  assert.deepEqual(deleteCalls, [{ organizationId: "org-1", id: "artifact-1", kind: "capabilities" }])
})

test("a re-upload that drops *.capabilities.json clears the stale capabilities row from an earlier upload", async () => {
  // The bug this guards against: storeArtifactContent only upserts, it never
  // deletes. Without an explicit clear, re-uploading a bundle with the
  // capabilities file removed would leave the old row in place, and the
  // signed manifest would keep advertising bytes the current archive no
  // longer contains.
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  overLimitKind = null
  storeCalls.length = 0
  deleteCalls.length = 0
  existingCapabilitiesRow = true // simulates a capabilities row from an earlier upload
  const files = validBundleFiles()
  delete files["test-tool.capabilities.json"]
  const zip = zipSync(files, { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())
  const json = await response.json()

  assert.equal(response.status, 201)
  assert.deepEqual(
    json.content.map((c) => c.kind),
    ["wasm", "manifest_toml", "bundle_zip"]
  )
  assert.deepEqual(deleteCalls, [{ organizationId: "org-1", id: "artifact-1", kind: "capabilities" }])
  assert.equal(existingCapabilitiesRow, false, "the stale row must actually be cleared")
})

test("translates an over-the-D3-limit content kind into a 400 naming the file, not a 413", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  overLimitKind = "wasm"
  storeCalls.length = 0
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())
  const text = await response.text()

  assert.equal(response.status, 400)
  assert.match(text, /wasm\/test\.wasm/) // names the offending path, not just the kind
  assert.match(text, /Content exceeds the 5MB limit/)
  overLimitKind = null
})

test("rejects a bundle upload for a non-tool artifact with 409", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "skill" }
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())
  const text = await response.text()

  assert.equal(response.status, 409)
  assert.match(text, /Bundle upload is only supported for tools/)
})

test("denies a cross-org upload with 404, matching the other [id] routes", async () => {
  sameOriginThrows = null
  getArtifactThrows = new Response("Artifact not found", { status: 404 })
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())

  assert.equal(response.status, 404)
})

test("re-validates from scratch and rejects an archive that fails a D6 rule", async () => {
  sameOriginThrows = null
  getArtifactThrows = null
  getArtifactResult = { id: "artifact-1", type: "tool" }
  const files = validBundleFiles()
  delete files["manifest.toml"]
  const zip = zipSync(files, { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())
  const text = await response.text()

  assert.equal(response.status, 400)
  assert.match(text, /Zip is missing manifest\.toml at its root/)
})

test("rejects a cross-origin request via the same-origin guard", async () => {
  sameOriginThrows = new Error("Cross-origin request blocked.")
  getArtifactThrows = null
  const zip = zipSync(validBundleFiles(), { level: 0 })

  const response = await PUT(makeRequest(zip), makeParams())

  assert.equal(response.status, 400)
})
