import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test, { mock } from "node:test"

process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET ??=
  "test-secret-at-least-32-characters-long"

// The member table stands in for the composition service's rows: one entry per
// (loadout, member artifact) pair. `findFirst` is answered by matching the
// same four conditions the real query asserts, so a check that quietly stopped
// scoping by organization fails here rather than passing on a looser mock.
let members = []
let memberQueries = []

mock.module("../db", {
  namedExports: {
    prisma: {
      loadoutMember: {
        findFirst: async ({ where }) => {
          memberQueries.push(where)
          const found = members.find(
            (member) =>
              member.loadoutId === where.loadoutId &&
              member.artifactId === where.artifactId &&
              member.organizationId === where.loadout?.organizationId &&
              member.organizationId === where.artifact?.organizationId
          )
          return found ? { id: `member-${found.artifactId}` } : null
        },
      },
    },
  },
})

const {
  authorizeArtifactRead,
  mintArtifactToken,
  mintInstallTokenForArtifact,
  mintLoadoutToken,
  verifyArtifactToken,
} = await import("./token.ts")

function reset() {
  members = []
  memberQueries = []
}

const isForbidden = (error) => error instanceof Response && error.status === 403

test("a minted token round-trips through verify with matching claims", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })

  const claims = verifyArtifactToken(token)

  assert.equal(claims.organizationId, "org-1")
  assert.equal(claims.artifactId, "artifact-1")
  // Absent, not null or empty: the absence is what selects the single-artifact
  // authorization rule below.
  assert.equal(claims.loadoutId, undefined)
})

test("an expired token is rejected", () => {
  const mintedAt = 0
  const token = mintArtifactToken(
    { organizationId: "org-1", artifactId: "artifact-1", ttlSeconds: 60 },
    mintedAt
  )

  assert.throws(() => verifyArtifactToken(token, mintedAt + 61_000), isForbidden)
})

test("a tampered token is rejected", () => {
  const token = mintArtifactToken({
    organizationId: "org-1",
    artifactId: "artifact-1",
    ttlSeconds: 3600,
  })
  const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a")

  assert.throws(() => verifyArtifactToken(tampered), isForbidden)
})

test("task 6.1: a loadout token round-trips with its loadout scope", () => {
  const token = mintLoadoutToken({
    organizationId: "org-1",
    loadoutId: "loadout-1",
    ttlSeconds: 3600,
  })

  const claims = verifyArtifactToken(token)

  assert.equal(claims.loadoutId, "loadout-1")
  // The loadout is also the artifact whose manifest the token fetches, so the
  // manifest route needs no loadout-specific branch to find its document.
  assert.equal(claims.artifactId, "loadout-1")
})

test("task 6.1: a loadout token expires on the same clock as an artifact token", () => {
  const mintedAt = 0
  const token = mintLoadoutToken(
    { organizationId: "org-1", loadoutId: "loadout-1", ttlSeconds: 900 },
    mintedAt
  )

  assert.doesNotThrow(() => verifyArtifactToken(token, mintedAt + 899_000))
  assert.throws(() => verifyArtifactToken(token, mintedAt + 900_000), isForbidden)
})

// --- Task 6.2 / 8.5: membership authorization -------------------------------

test("task 6.2: a single-artifact token authorizes its own artifact and nothing else", async () => {
  reset()
  const claims = verifyArtifactToken(
    mintArtifactToken({
      organizationId: "org-1",
      artifactId: "artifact-1",
      ttlSeconds: 3600,
    })
  )

  await authorizeArtifactRead(claims, "artifact-1")
  await assert.rejects(
    () => authorizeArtifactRead(claims, "artifact-2"),
    isForbidden
  )
})

test("task 6.2: a single-artifact token never consults membership at all", async () => {
  reset()
  // The artifact it names is a member of a loadout, and the token is still not
  // a loadout token. Widening happens by minting a loadout-scoped claim, never
  // by aiming an existing token at a loadout's members, so this path must not
  // even ask the member table.
  members = [
    {
      loadoutId: "loadout-1",
      artifactId: "artifact-2",
      organizationId: "org-1",
    },
  ]
  const claims = verifyArtifactToken(
    mintArtifactToken({
      organizationId: "org-1",
      artifactId: "artifact-1",
      ttlSeconds: 3600,
    })
  )

  await assert.rejects(
    () => authorizeArtifactRead(claims, "artifact-2"),
    isForbidden
  )
  assert.deepEqual(memberQueries, [])
})

test("task 6.2: a loadout token authorizes every member of its loadout", async () => {
  reset()
  members = [
    { loadoutId: "loadout-1", artifactId: "tool-1", organizationId: "org-1" },
    { loadoutId: "loadout-1", artifactId: "skill-1", organizationId: "org-1" },
    { loadoutId: "loadout-1", artifactId: "soul-1", organizationId: "org-1" },
  ]
  const claims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )

  for (const artifactId of ["tool-1", "skill-1", "soul-1"]) {
    await authorizeArtifactRead(claims, artifactId)
  }
})

test("task 8.5: a loadout token cannot read a non-member artifact of the same organization", async () => {
  reset()
  // The whole point of authorizing against membership rather than against a
  // bare organization match (design.md -- "Token claims move from an artifact
  // to a loadout, with membership authorization"). Same org, same owner, same
  // token: not a member, not readable.
  members = [
    { loadoutId: "loadout-1", artifactId: "tool-1", organizationId: "org-1" },
  ]
  const claims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )

  await assert.rejects(
    () => authorizeArtifactRead(claims, "unrelated-tool"),
    isForbidden
  )
})

test("task 8.5: a loadout token cannot read a member of a different loadout", async () => {
  reset()
  members = [
    { loadoutId: "loadout-2", artifactId: "tool-2", organizationId: "org-1" },
  ]
  const claims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )

  await assert.rejects(() => authorizeArtifactRead(claims, "tool-2"), isForbidden)
})

test("task 8.5: a loadout token does not authorize the loadout row itself", async () => {
  reset()
  members = [
    { loadoutId: "loadout-1", artifactId: "tool-1", organizationId: "org-1" },
  ]
  const claims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )

  // A loadout publishes no content of its own -- it publishes its members'.
  // Authorizing it would grant a read that can only ever be a probe.
  await assert.rejects(
    () => authorizeArtifactRead(claims, "loadout-1"),
    isForbidden
  )
})

test("task 6.2: membership is matched inside the token's organization", async () => {
  reset()
  // The row exists and names the right loadout and artifact, but belongs to
  // another organization. Composition refuses cross-organization members, so
  // this row should not exist -- which is exactly why the read path checks
  // instead of assuming.
  members = [
    { loadoutId: "loadout-1", artifactId: "tool-1", organizationId: "org-2" },
  ]
  const claims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )

  await assert.rejects(() => authorizeArtifactRead(claims, "tool-1"), isForbidden)
  assert.equal(memberQueries.length, 1)
  assert.equal(memberQueries[0].loadout.organizationId, "org-1")
  assert.equal(memberQueries[0].artifact.organizationId, "org-1")
})

test("task 6.2: membership is re-read per request rather than carried in the token", async () => {
  reset()
  members = [
    { loadoutId: "loadout-1", artifactId: "tool-1", organizationId: "org-1" },
  ]
  const claims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )

  await authorizeArtifactRead(claims, "tool-1")

  // Removing the member takes effect immediately, not at the next TTL.
  members = []
  await assert.rejects(() => authorizeArtifactRead(claims, "tool-1"), isForbidden)
})

test("task 6.2: a refused loadout read is indistinguishable from a refused artifact read", async () => {
  reset()
  const loadoutClaims = verifyArtifactToken(
    mintLoadoutToken({
      organizationId: "org-1",
      loadoutId: "loadout-1",
      ttlSeconds: 900,
    })
  )
  const artifactClaims = verifyArtifactToken(
    mintArtifactToken({
      organizationId: "org-1",
      artifactId: "artifact-1",
      ttlSeconds: 900,
    })
  )

  const responses = []
  for (const claims of [loadoutClaims, artifactClaims]) {
    await authorizeArtifactRead(claims, "tool-9").catch((error) =>
      responses.push(error)
    )
  }

  assert.equal(responses.length, 2)
  assert.equal(responses[0].status, responses[1].status)
  assert.equal(await responses[0].text(), await responses[1].text())
})

test("a claim carrying a non-string loadout scope is rejected rather than downgraded", () => {
  reset()
  // Signed with the real secret on purpose: the signature check is the outer
  // guarantee and would hide this one. What is being tested is that a
  // *validly signed* payload whose `loadoutId` this code cannot authorize
  // against is refused rather than quietly falling back to the
  // single-artifact rule, which would grant it a read.
  const signed = signClaims({
    organizationId: "org-1",
    artifactId: "loadout-1",
    loadoutId: { nested: "loadout-1" },
    exp: Math.floor(Date.now() / 1000) + 900,
  })

  assert.throws(() => verifyArtifactToken(signed), isForbidden)
})

function signClaims(claims) {
  const encoded = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url"
  )
  const payload = `v1.${encoded}`
  const signature = createHmac(
    "sha256",
    process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET
  )
    .update(payload)
    .digest("base64url")
  return `${payload}.${signature}`
}

// --- Task 6.1: choosing the token kind at the two mint sites ----------------

test("task 6.1: a loadout artifact mints a loadout-scoped token", () => {
  const token = mintInstallTokenForArtifact(
    { id: "loadout-1", type: "loadout" },
    { organizationId: "org-1", ttlSeconds: 900 }
  )

  const claims = verifyArtifactToken(token)

  assert.equal(claims.loadoutId, "loadout-1")
  assert.equal(claims.artifactId, "loadout-1")
})

test("task 6.1: every other type mints byte-identically to before loadouts existed", () => {
  // Byte-for-byte, not merely equivalent: the single-artifact path is the one
  // already in production use, and the whole point of routing it through this
  // function is that it comes out the other side unchanged.
  const at = 1_700_000_000_000
  for (const type of ["tool", "skill", "soul"]) {
    assert.equal(
      mintInstallTokenForArtifact(
        { id: "artifact-1", type },
        { organizationId: "org-1", ttlSeconds: 900 },
        at
      ),
      mintArtifactToken(
        {
          organizationId: "org-1",
          artifactId: "artifact-1",
          ttlSeconds: 900,
        },
        at
      ),
      `a ${type} must mint the artifact token it always minted`
    )
  }
})

test("task 6.1: the token kind follows the artifact row, not a caller's label", async () => {
  reset()
  members = [
    { loadoutId: "loadout-1", artifactId: "tool-1", organizationId: "org-1" },
  ]

  // A loadout row mints a credential that reads its members...
  const loadoutToken = mintInstallTokenForArtifact(
    { id: "loadout-1", type: "loadout" },
    { organizationId: "org-1", ttlSeconds: 900 }
  )
  await authorizeArtifactRead(verifyArtifactToken(loadoutToken), "tool-1")

  // ...and a tool row mints one that does not, even for a member of the
  // loadout it happens to belong to.
  const toolToken = mintInstallTokenForArtifact(
    { id: "loadout-1", type: "tool" },
    { organizationId: "org-1", ttlSeconds: 900 }
  )
  await assert.rejects(
    () => authorizeArtifactRead(verifyArtifactToken(toolToken), "tool-1"),
    isForbidden
  )
})
