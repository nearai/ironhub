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

test("a token minted for one artifact does not verify against another", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })

  const claims = verifyArtifactToken(token)

  assert.notEqual(claims.artifactId, "artifact-2")
})
