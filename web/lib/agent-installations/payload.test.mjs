import assert from "node:assert/strict"
import { test } from "node:test"

const { createInstallPayload } = await import("./payload.ts")

/**
 * The install payload is the HMAC'd message the IronClaw agent re-derives and
 * verifies (`ironclaw:crates/ironclaw_reborn_composition/src/ironhub/agent_link.rs`),
 * so its field set and their order are a cross-language contract, not an
 * implementation detail. `scripts/check-install-payload-signing.mjs` pins the
 * signature; this pins the shape, in the suite that runs beside the resolution
 * change that must not disturb it.
 *
 * Catalog selection decides *which* artifact is resolved. It must not reach
 * the description of the resolved artifact -- so the tests below are the ones
 * that should fail if a `source` or a `type` ever leaks into the payload.
 */
const BASE = {
  slug: "my-skill",
  version: "1.0.0",
  userId: "user-1",
  agentInstallationId: "aid-1",
  ts: 1700000000,
  nonce: "nonce-abc",
  artifactDigest: "sha256:deadbeef",
}

test("the signed payload carries exactly eight fields, in their pinned order", () => {
  // Read back off the wire format rather than off the input object: the
  // agent parses these bytes, so the assertion is on what it sees. Every
  // field is `:<byte length>:<value>` after the `install` prefix, and the
  // trailing `0:` is the absent private manifest URL.
  assert.equal(
    createInstallPayload(BASE),
    "install:8:my-skill:5:1.0.0:6:user-1:5:aid-1:10:1700000000:9:nonce-abc:15:sha256:deadbeef:0:"
  )
})

test("the private manifest url is the eighth field and nothing follows it", () => {
  const url = "https://hub.example/api/private-artifacts/manifest/tok"

  assert.equal(
    createInstallPayload({ ...BASE, privateManifestUrl: url }),
    `install:8:my-skill:5:1.0.0:6:user-1:5:aid-1:10:1700000000:9:nonce-abc:15:sha256:deadbeef:${url.length}:${url}`
  )
})

test("an unknown input field is not folded into the payload", () => {
  // Source selection reaches createInstallIntent as `source` and `type`. If
  // either were ever passed down and appended here, every signature the agent
  // has learned to verify would stop matching -- so the payload ignores what
  // it was not asked to sign.
  assert.equal(
    createInstallPayload({ ...BASE, source: "private", type: "skill" }),
    createInstallPayload(BASE)
  )
})
