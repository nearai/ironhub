import { createHmac, timingSafeEqual } from "node:crypto"

import { prisma } from "../db"

const TOKEN_VERSION = "v1"

/**
 * What a bearer of this token is allowed to read.
 *
 * `artifactId` is the artifact the token was minted *for* -- the single
 * artifact being installed, or the loadout itself. It is what the manifest
 * route builds its document from, so it is present on every token.
 *
 * `loadoutId` is present only on a loadout-scoped token, and it is the claim
 * that widens the grant: reads are authorized against the members of that one
 * loadout rather than against `artifactId` alone. It is scoped to a single
 * loadout rather than to the organization on purpose -- design.md, "Token
 * claims move from an artifact to a loadout, with membership authorization":
 * the widening is unavoidable because the agent walks one manifest with one
 * credential, and the mitigations are the short TTL, the loadout (not
 * organization) scope, and per-read membership authorization below.
 *
 * The field is additive and optional, so `v1` still describes both shapes: a
 * token minted for one artifact encodes exactly the bytes it did before this
 * change, and no token outlives its TTL (at most 900 s, see
 * `ARTIFACT_TOKEN_TTL_SECONDS`) anyway.
 */
export type ArtifactTokenClaims = {
  organizationId: string
  artifactId: string
  loadoutId?: string
  exp: number
}

function loadSecret(): string {
  const secret = process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET
  if (!secret) {
    throw new Error("IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET is not set")
  }
  if (secret.length < 32) {
    throw new Error(
      "IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET must be at least 32 characters"
    )
  }
  return secret
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function reject(): never {
  throw new Response("Invalid or expired artifact token", { status: 403 })
}

function encode(claims: ArtifactTokenClaims): string {
  const encoded = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url"
  )
  const payload = `${TOKEN_VERSION}.${encoded}`
  return `${payload}.${sign(payload, loadSecret())}`
}

export function mintArtifactToken(
  input: { organizationId: string; artifactId: string; ttlSeconds: number },
  now: number = Date.now()
): string {
  return encode({
    organizationId: input.organizationId,
    artifactId: input.artifactId,
    exp: Math.floor(now / 1000) + input.ttlSeconds,
  })
}

/**
 * Mints the one credential a loadout install walks its whole manifest with.
 *
 * Separate from `mintArtifactToken` rather than an optional argument to it, so
 * that widening a token to a loadout is a different call at the call site and
 * cannot happen by passing an extra field. The TTL is the caller's, and is
 * meant to stay the artifact TTL: a measured twenty-member install spends a
 * small fraction of it (design.md -- Open Questions).
 */
export function mintLoadoutToken(
  input: { organizationId: string; loadoutId: string; ttlSeconds: number },
  now: number = Date.now()
): string {
  return encode({
    organizationId: input.organizationId,
    // The loadout is the artifact whose manifest is served, so it is both the
    // token's artifact and its membership scope.
    artifactId: input.loadoutId,
    loadoutId: input.loadoutId,
    exp: Math.floor(now / 1000) + input.ttlSeconds,
  })
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
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
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
  // Absent means "one artifact"; present means "one loadout". Anything else is
  // a claim this code cannot authorize against, and is refused rather than
  // ignored -- ignoring it would silently fall back to the narrower rule for a
  // token whose payload we do not understand.
  if (claims.loadoutId !== undefined && typeof claims.loadoutId !== "string") {
    reject()
  }
  if (Math.floor(now / 1000) >= claims.exp) {
    reject()
  }

  return claims
}

/**
 * The authorization every token-bearing read route runs before it touches
 * storage: may this token read *this* artifact?
 *
 * Two rules, and which one applies is decided by the claims, never by the
 * request:
 *
 * - No `loadoutId`: the token authorizes exactly the artifact it was minted
 *   for. Unchanged from before loadouts existed, and no membership lookup
 *   happens at all -- a leaked single-artifact token cannot be widened into a
 *   loadout token by aiming it at a loadout's members.
 * - With `loadoutId`: the token authorizes the members of that one loadout.
 *   Membership is read per request rather than baked into the token, so
 *   removing a member takes effect immediately instead of at the next TTL.
 *
 * Both the loadout and the member artifact are matched against the token's
 * organization. The loadout scope already bounds the grant -- design.md, "The
 * member visibility gate protects public loadouts, not organization members"
 * -- but a membership row is written by a different service than this one, and
 * an authorization check that trusts a row's shape is one bug away from
 * serving another organization's bytes.
 *
 * Public members are excluded structurally: their rows carry no `artifactId`
 * (they resolve live from upstream and are never served through this hub), so
 * they can never match here.
 */
export async function authorizeArtifactRead(
  claims: ArtifactTokenClaims,
  artifactId: string
): Promise<void> {
  if (!claims.loadoutId) {
    if (claims.artifactId !== artifactId) {
      throw new Response("Token does not match artifact", { status: 403 })
    }
    return
  }

  const member = await prisma.loadoutMember.findFirst({
    where: {
      loadoutId: claims.loadoutId,
      artifactId,
      loadout: { organizationId: claims.organizationId },
      artifact: { organizationId: claims.organizationId },
    },
    select: { id: true },
  })
  if (!member) {
    // Deliberately the same message and status the single-artifact rule gives:
    // the loadout a token is scoped to, and which artifacts belong to it, are
    // not facts a bearer holding the wrong token gets to enumerate.
    throw new Response("Token does not match artifact", { status: 403 })
  }
}

/**
 * Picks the token kind an install link needs from the artifact it is for.
 *
 * One function rather than a ternary at each call site, because there are two
 * of them -- the workspace's install-link route and the install-intent
 * resolver -- and minting the wrong kind fails late and silently: a loadout
 * handed a single-artifact token serves its manifest and then refuses the
 * first member read, with a 403 that names no cause. Keyed on the artifact
 * row's own type rather than on the type a caller asked for, so the decision
 * cannot disagree with the row it is about.
 *
 * Every other type mints exactly what it minted before loadouts existed, byte
 * for byte -- the single-artifact path is the one in production use, and
 * nothing here is allowed to move it.
 */
export function mintInstallTokenForArtifact(
  artifact: { id: string; type: string },
  input: { organizationId: string; ttlSeconds: number },
  now: number = Date.now()
): string {
  if (artifact.type === "loadout") {
    return mintLoadoutToken(
      {
        organizationId: input.organizationId,
        loadoutId: artifact.id,
        ttlSeconds: input.ttlSeconds,
      },
      now
    )
  }

  return mintArtifactToken(
    {
      organizationId: input.organizationId,
      artifactId: artifact.id,
      ttlSeconds: input.ttlSeconds,
    },
    now
  )
}
