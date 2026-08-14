import assert from "node:assert/strict"
import test from "node:test"

process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET ??=
  "test-secret-at-least-32-characters-long"

const { mintArtifactToken, verifyArtifactToken } = await import("./token.ts")

test("a minted token round-trips through verify with matching claims", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })

  const claims = verifyArtifactToken(token)

  assert.equal(claims.organizationId, "org-1")
  assert.equal(claims.artifactId, "artifact-1")
})

test("an expired token is rejected", () => {
  const mintedAt = 0
  const token = mintArtifactToken(
    { organizationId: "org-1", artifactId: "artifact-1", ttlSeconds: 60 },
    mintedAt
  )

  assert.throws(
    () => verifyArtifactToken(token, mintedAt + 61_000),
    (error) => error instanceof Response && error.status === 403
  )
})

test("a tampered token is rejected", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })
  const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a")

  assert.throws(
    () => verifyArtifactToken(tampered),
    (error) => error instanceof Response && error.status === 403
  )
})

// Mirrors the artifact-id guard used by the content-by-token route
// (GET /[id]/content/[kind]/[token]): the route path's `id` must match the
// token's bound artifactId, or it rejects with 403.
function assertTokenMatchesArtifact(token, id) {
  const claims = verifyArtifactToken(token)
  if (claims.artifactId !== id) {
    throw new Response("Token does not match artifact", { status: 403 })
  }
  return claims
}

test("a token minted for one artifact is rejected against a different artifact id", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })

  assert.throws(
    () => assertTokenMatchesArtifact(token, "artifact-2"),
    (error) => error instanceof Response && error.status === 403
  )
})

test("a token minted for one artifact is accepted for that same artifact id", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })

  const claims = assertTokenMatchesArtifact(token, "artifact-1")

  assert.equal(claims.artifactId, "artifact-1")
})
