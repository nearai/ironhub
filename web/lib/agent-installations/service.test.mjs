import assert from "node:assert/strict"
import { mock, test } from "node:test"

// Isolates resolveInstallArtifact's private branch from the real catalog
// filesystem scan (getMarketplaceCatalogItem walks tools/ + skills/ via
// readTools/readSkills) -- returning null/undefined here is what routes
// every test below into resolvePrivateInstall.
let marketplaceItem = null
mock.module("@/lib/catalog/server", {
  namedExports: {
    getMarketplaceCatalogItem: async () => marketplaceItem,
  },
})

// Never reached on this path (marketplaceItem is always null below, so
// resolveInstallArtifact takes the private branch before this would be
// called) -- mocked anyway because manifest.server.ts's own import graph
// uses a TS parameter-property class field the plain `node --test` strip-
// types loader can't parse, and a static `import` evaluates the whole
// module regardless of whether this test path calls it.
mock.module("@/lib/catalog/manifest.server", {
  namedExports: {
    buildUnifiedManifest: async () => {
      throw new Error("buildUnifiedManifest should not be called on the private-install path")
    },
  },
})

let findFirstResult = null
mock.module("@/lib/db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        findFirst: async () => findFirstResult,
      },
    },
  },
})

process.env.NEXT_PUBLIC_APP_URL = "https://hub.example"
process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET = "a".repeat(32)

const { resolveInstallArtifact } = await import("./service.ts")

function toolArtifact(contentKinds) {
  return {
    id: "artifact-1",
    name: "firecrawl",
    version: "0.1.0",
    type: "tool",
    content: contentKinds.map((kind) => ({ kind, sha256: `sha-${kind}` })),
  }
}

function baseInput(overrides = {}) {
  return {
    slug: "firecrawl",
    userId: "user-1",
    organizationId: "org-1",
    ...overrides,
  }
}

test("resolves a capabilities-less private tool (wasm + manifest_toml only) instead of throwing", async () => {
  // This is the exact shape a bundle upload with no *.capabilities.json
  // produces (design.md D3/D6): content_complete already treats it as
  // complete, so install resolution must not disagree and call it
  // "missing installable content".
  marketplaceItem = null
  findFirstResult = toolArtifact(["wasm", "manifest_toml"])

  const resolved = await resolveInstallArtifact(baseInput())

  assert.equal(resolved.slug, "firecrawl")
  assert.equal(resolved.version, "0.1.0")
  assert.ok(resolved.digest.startsWith("sha256:"))
  assert.ok(resolved.privateManifest?.url.includes("/api/private-artifacts/manifest/"))
})

test("still folds capabilities into the digest when a capabilities row exists", async () => {
  marketplaceItem = null
  findFirstResult = toolArtifact(["wasm", "capabilities", "manifest_toml"])

  const withCapabilities = await resolveInstallArtifact(baseInput())

  findFirstResult = toolArtifact(["wasm", "manifest_toml"])
  const withoutCapabilities = await resolveInstallArtifact(baseInput())

  // Presence of capabilities must still change the digest -- proves the fix
  // folds it in when present rather than always ignoring it.
  assert.notEqual(withCapabilities.digest, withoutCapabilities.digest)
})

test("still throws when wasm itself is missing -- wasm remains unconditionally required", async () => {
  marketplaceItem = null
  findFirstResult = toolArtifact(["capabilities", "manifest_toml"])

  await assert.rejects(
    () => resolveInstallArtifact(baseInput()),
    /Private tool is missing installable content/
  )
})

test("throws 'not found' when no artifact matches in the organization", async () => {
  marketplaceItem = null
  findFirstResult = null

  await assert.rejects(
    () => resolveInstallArtifact(baseInput()),
    /Marketplace Entry not found/
  )
})
