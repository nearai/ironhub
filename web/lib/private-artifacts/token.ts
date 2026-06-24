import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_VERSION = "v1"

export type ArtifactTokenClaims = {
  organizationId: string
  artifactId: string
  exp: number
}

function loadSecret(): string {
  const secret = process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET
  if (!secret) {
    throw new Error("IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET is not set")
  }
  return secret
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function reject(): never {
  throw new Response("Invalid or expired artifact token", { status: 403 })
}

export function mintArtifactToken(
  input: { organizationId: string; artifactId: string; ttlSeconds: number },
  now: number = Date.now()
): string {
  const claims: ArtifactTokenClaims = {
    organizationId: input.organizationId,
    artifactId: input.artifactId,
    exp: Math.floor(now / 1000) + input.ttlSeconds,
  }
  const encoded = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url"
  )
  const payload = `${TOKEN_VERSION}.${encoded}`
  return `${payload}.${sign(payload, loadSecret())}`
}

export function verifyArtifactToken(
  token: string,
  now: number = Date.now()
): ArtifactTokenClaims {
  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    reject()
  }

  const payload = `${parts[0]}.${parts[1]}`
  const expected = Buffer.from(sign(payload, loadSecret()))
  const provided = Buffer.from(parts[2])
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    reject()
  }

  let claims: ArtifactTokenClaims
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
  } catch {
    return reject()
  }

  if (
    typeof claims.organizationId !== "string" ||
    typeof claims.artifactId !== "string" ||
    typeof claims.exp !== "number"
  ) {
    reject()
  }
  if (Math.floor(now / 1000) >= claims.exp) {
    reject()
  }

  return claims
}
