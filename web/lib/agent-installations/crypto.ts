import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12

type EncryptedSecret = {
  encryptedSharedKey: string
  iv: string
  authTag: string
}

export function encryptSharedKey(sharedKey: string): EncryptedSecret {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(sharedKey, "utf8"),
    cipher.final(),
  ])

  return {
    encryptedSharedKey: encrypted.toString("base64url"),
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  }
}

export function decryptSharedKey(secret: EncryptedSecret) {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(secret.iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64url"))

  return Buffer.concat([
    decipher.update(Buffer.from(secret.encryptedSharedKey, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function generateSharedKey() {
  return `ihub_sk_${randomBytes(32).toString("base64url")}`
}

export function createKeyFingerprint(sharedKey: string) {
  const suffix = createHmac("sha256", sharedKey)
    .update("ironhub:key-fingerprint")
    .digest("hex")
    .slice(0, 8)

  return `ihub_sk_...${suffix}`
}

export function signInstallPayload(sharedKey: string, payload: string) {
  return createHmac("sha256", sharedKey).update(payload).digest("hex")
}

export function artifactDigest(parts: string[]) {
  return createHash("sha256").update(parts.join(":")).digest("hex")
}

export function hashNonce(nonce: string) {
  return createHmac("sha256", getEncryptionKey())
    .update(nonce)
    .digest("base64url")
}

function getEncryptionKey() {
  const secret = process.env.IRONHUB_KEY_ENCRYPTION_SECRET

  if (!secret) {
    throw new Error("IRONHUB_KEY_ENCRYPTION_SECRET is required")
  }

  return createHmac("sha256", "ironhub:key-encryption").update(secret).digest()
}
