// Install-payload signing parity check. Run: `pnpm signing:check`.
//
// Proves, without a test framework, that the hub's real createInstallPayload
// produces the exact length-prefixed bytes and HMAC-SHA256 vector the IronClaw
// agent verifies (crates/ironclaw_reborn_composition/src/ironhub/agent_link.rs
// tests pin the same SHARED_KEY and INSTALL_SIG). If either side drifts, the
// deep-link install signatures stop matching.

import { createHmac } from "node:crypto"

import { createInstallPayload } from "../lib/agent-installations/payload.ts"

const SHARED_KEY = "ihub_sk_E2ETestSharedKey0000000000000000000000000"
const BASE = {
  slug: "my-skill",
  version: "1.0.0",
  userId: "user-1",
  agentInstallationId: "aid-1",
  ts: 1700000000,
  nonce: "nonce-abc",
  artifactDigest: "sha256:deadbeef",
}
const EXPECTED_PAYLOAD =
  "install:8:my-skill:5:1.0.0:6:user-1:5:aid-1:10:1700000000:9:nonce-abc:15:sha256:deadbeef:0:"
const EXPECTED_SIG =
  "d1b7519d96c098b84554ac8c5be9838ccd979249ea892378105ab0febe9b0472"
const MANIFEST_URL = "https://hub.example/api/private-artifacts/manifest/tok"
const EXPECTED_PAYLOAD_WITH_URL =
  "install:8:my-skill:5:1.0.0:6:user-1:5:aid-1:10:1700000000:9:nonce-abc:15:sha256:deadbeef:54:" +
  MANIFEST_URL

function hmac(payload) {
  return createHmac("sha256", SHARED_KEY).update(payload).digest("hex")
}

let failed = false
function check(condition, label) {
  if (condition) {
    console.log(`ok   ${label}`)
  } else {
    console.error(`FAIL ${label}`)
    failed = true
  }
}

const base = createInstallPayload(BASE)
check(base === EXPECTED_PAYLOAD, "install payload matches the pinned length-prefixed bytes")
check(hmac(base) === EXPECTED_SIG, "install payload signs to the shared cross-language vector")

const withUrl = createInstallPayload({ ...BASE, privateManifestUrl: MANIFEST_URL })
check(
  withUrl === EXPECTED_PAYLOAD_WITH_URL,
  "private manifest url is length-prefixed into the payload"
)
check(hmac(withUrl) !== EXPECTED_SIG, "changing the private manifest url changes the signature")

if (failed) {
  console.error("install payload signing parity check FAILED")
  process.exit(1)
}
console.log("install payload signing parity check passed")
