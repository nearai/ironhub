import { createPrivateKey, sign } from "node:crypto"

import type { HubManifest } from "@/lib/catalog/manifest-types"

// key_id of the Ed25519 keypair whose PUBLIC half is embedded in IronClaw
// (MANIFEST_VERIFY_KEYS). The private half is read from the environment and
// never lives in this repo.
export const MANIFEST_SIGNING_KEY_ID = "5895a21abea89672"

export type SignedManifestEnvelope = {
  v: 1
  key_id: string
  manifest_b64: string
  sig: string
}

export class ManifestSigningError extends Error {}

function loadSigningKey() {
  const encoded = process.env.IRONHUB_MANIFEST_SIGNING_KEY
  if (!encoded) {
    throw new ManifestSigningError("IRONHUB_MANIFEST_SIGNING_KEY is not set")
  }
  const pem = Buffer.from(encoded, "base64").toString("utf8")
  try {
    return createPrivateKey(pem)
  } catch {
    throw new ManifestSigningError(
      "IRONHUB_MANIFEST_SIGNING_KEY is not a valid base64 PKCS8 Ed25519 key"
    )
  }
}

// Signs the exact manifest bytes and carries them verbatim in the envelope so the
// verifier reconstructs precisely what was signed (no JSON canonicalization gap).
export function signManifest(manifest: HubManifest): SignedManifestEnvelope {
  const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8")
  const key = loadSigningKey()
  const signature = sign(null, manifestBytes, key)
  return {
    v: 1,
    key_id: MANIFEST_SIGNING_KEY_ID,
    manifest_b64: manifestBytes.toString("base64url"),
    sig: signature.toString("base64url"),
  }
}
