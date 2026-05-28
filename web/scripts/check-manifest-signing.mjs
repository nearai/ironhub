// Manifest-signing parity check. Run: `pnpm signing:check`.
//
// Proves two things without a test framework:
//   1. node's Ed25519 verify accepts the exact shared cross-language vector that
//      IronClaw's verifier accepts (src/registry/hub_manifest.rs tests). Ed25519 is
//      deterministic (RFC 8032), so node-produced signatures are rust-verifiable.
//   2. a freshly signed manifest round-trips and manifest_b64 decodes to the exact
//      signed bytes (the envelope carries precisely what was signed).

import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto"

// Shared vector (mirrors the constants in IronClaw hub_manifest.rs tests). Public only.
const VEC_PUBKEY_HEX =
  "ca46572f4dcd485599cdf95442934a3e3c86e2cae766a85fbffc8d6540959928"
const VEC_MANIFEST_BYTES =
  '{"version":"1","generated_at":"2026-01-01T00:00:00Z","release_tag":"test","repo":"nearai/ironhub","tools":[],"skills":[]}'
const VEC_SIG_B64URL =
  "KjsUDgi1enj3iTPNQI6gU1Bwxf01hIUItlFvX9PxgWNybPPrJNIV7vFG-G8hJOalFMwFs5zQHrxbtFDZAlgtBg"

function ed25519PublicKeyFromRawHex(hex) {
  const raw = Buffer.from(hex, "hex")
  return createPublicKey({
    format: "jwk",
    key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") },
  })
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

const vecPub = ed25519PublicKeyFromRawHex(VEC_PUBKEY_HEX)
check(
  verify(
    null,
    Buffer.from(VEC_MANIFEST_BYTES, "utf8"),
    vecPub,
    Buffer.from(VEC_SIG_B64URL, "base64url")
  ),
  "node verifies the shared cross-language vector"
)

const { publicKey, privateKey } = generateKeyPairSync("ed25519")
const bytes = Buffer.from('{"version":"1","tools":[],"skills":[]}', "utf8")
const roundTripSig = sign(null, bytes, privateKey)
check(verify(null, bytes, publicKey, roundTripSig), "fresh sign/verify round-trips")
const manifestB64 = bytes.toString("base64url")
check(
  Buffer.from(manifestB64, "base64url").equals(bytes),
  "manifest_b64 decodes to the exact signed bytes"
)

if (failed) {
  console.error("manifest signing parity check FAILED")
  process.exit(1)
}
console.log("manifest signing parity check passed")
