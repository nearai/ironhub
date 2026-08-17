import assert from "node:assert/strict"
import { mock, test } from "node:test"

let findFirstResult = null

mock.module("../db", {
  namedExports: {
    prisma: {
      privateArtifact: {
        findFirst: async () => findFirstResult,
      },
    },
  },
})

const { buildPrivateArtifactManifest } = await import("./manifest.ts")

function baseInput() {
  return {
    organizationId: "org-1",
    artifactId: "artifact-1",
    token: "tok",
    baseUrl: "https://hub.example",
    generatedAt: "2026-08-17T00:00:00.000Z",
  }
}

function toolArtifact(contentKinds) {
  return {
    id: "artifact-1",
    type: "tool",
    name: "firecrawl",
    version: "0.1.0",
    description: "desc",
    content: contentKinds.map((kind) => ({
      kind,
      sha256: `sha-${kind}`,
      sizeBytes: kind.length,
    })),
  }
}

test("task 3.7: emits the optional manifest hub artifact when manifest_toml exists", async () => {
  findFirstResult = toolArtifact(["wasm", "capabilities", "manifest_toml"])

  const manifest = await buildPrivateArtifactManifest(baseInput())

  assert.equal(manifest.tools.length, 1)
  const tool = manifest.tools[0]
  assert.ok(tool.manifest, "expected the manifest hub artifact to be present")
  assert.equal(tool.manifest.sha256, "sha-manifest_toml")
  assert.match(tool.manifest.url, /\/content\/manifest_toml\//)
  // wasm/capabilities are always required and must still be present.
  assert.ok(tool.wasm)
  assert.ok(tool.capabilities)
})

test("task 3.7: omits the manifest hub artifact without throwing when manifest_toml is absent", async () => {
  findFirstResult = toolArtifact(["wasm", "capabilities"])

  const manifest = await buildPrivateArtifactManifest(baseInput())

  assert.equal(manifest.tools.length, 1)
  const tool = manifest.tools[0]
  assert.equal(tool.manifest, undefined)
  // The manifest key must not even round-trip as a null through JSON --
  // absence should mean absence, matching HubToolEntry.manifest being
  // optional rather than nullable.
  assert.equal("manifest" in JSON.parse(JSON.stringify(manifest.tools[0])), false)
})

test("skills are unaffected: no manifest field is ever attached to a skill entry", async () => {
  findFirstResult = {
    id: "artifact-2",
    type: "skill",
    name: "my-skill",
    version: "0.1.0",
    description: "desc",
    content: [{ kind: "skill_md", sha256: "sha-skill_md", sizeBytes: 10 }],
  }

  const manifest = await buildPrivateArtifactManifest(baseInput())

  assert.equal(manifest.skills.length, 1)
  assert.equal("manifest" in manifest.skills[0], false)
})

test("still throws 409 when a required (non-optional) kind is missing", async () => {
  findFirstResult = toolArtifact([]) // wasm missing -- the only kind still unconditionally required

  await assert.rejects(
    () => buildPrivateArtifactManifest(baseInput()),
    (error) => error instanceof Response && error.status === 409
  )
})

test("emits the optional capabilities hub artifact when a capabilities row exists", async () => {
  findFirstResult = toolArtifact(["wasm", "capabilities", "manifest_toml"])

  const manifest = await buildPrivateArtifactManifest(baseInput())

  const tool = manifest.tools[0]
  assert.ok(tool.capabilities, "expected the capabilities hub artifact to be present")
  assert.equal(tool.capabilities.sha256, "sha-capabilities")
})

test("omits the capabilities hub artifact without throwing when no capabilities row exists", async () => {
  // The pre-bundle-ingest-vs-bundle-ingest situation is now symmetric with
  // manifest_toml: manifest.toml (design.md D3) owns the data
  // *.capabilities.json used to carry, so a tool created via a bundle
  // upload that had none is a valid, complete tool -- not missing anything.
  findFirstResult = toolArtifact(["wasm", "manifest_toml"])

  const manifest = await buildPrivateArtifactManifest(baseInput())

  const tool = manifest.tools[0]
  assert.equal(tool.capabilities, undefined)
  // Must not even round-trip as a null through JSON -- absence should mean
  // absence, matching HubToolEntry.capabilities being optional rather than
  // nullable (the same guarantee already required of `manifest`).
  assert.equal("capabilities" in JSON.parse(JSON.stringify(manifest.tools[0])), false)
})

test("throws 404 when the artifact does not exist in the organization", async () => {
  findFirstResult = null

  await assert.rejects(
    () => buildPrivateArtifactManifest(baseInput()),
    (error) => error instanceof Response && error.status === 404
  )
})
