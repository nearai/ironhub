// Task 8.6: one loadout install, walked the way an agent walks it, against the
// real rate limiters on all three token-authorized read routes.
//
// The routes are exercised together rather than one per file because the thing
// under test only exists between them: a loadout install is one manifest fetch
// plus every member's content and assets, on one token, inside one minute --
// and the budget that has to survive that is spread across three modules with
// three limiters. A per-route test can show a route serving 96 requests; only
// this one can show that the whole sequence a published loadout produces is
// never refused (spec: "Reads for a loadout install are not throttled as one
// artifact").
//
// The token module is NOT mocked here. Real claims are minted, verified, and
// authorized against a stand-in member table, so the sequence is authorized by
// the same code the routes run in production; only the database, object
// storage, and the manifest builder (owned by another workstream) are stubbed.
import assert from "node:assert/strict"
import { Readable } from "node:stream"
import { mock, test } from "node:test"

process.env.IRONHUB_PRIVATE_ARTIFACT_TOKEN_SECRET ??=
  "test-secret-at-least-32-characters-long"

const BASE_URL = "https://hub.example"
const ORG = "org-1"
const LOADOUT = "loadout-1"
const CLIENT_IP = "203.0.113.7"

// A large but legal loadout: twelve tools, seven skills, one soul. Each tool
// publishes three content kinds and six declared assets, which is a modest
// tool -- the agent's caps allow 32 schemas and 64 prompts each.
const MEMBERS = [
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `tool-${index}`,
    kind: "tool",
    contentKinds: ["wasm", "capabilities", "manifest_toml"],
    assets: [
      ["schema", "schemas/a.json"],
      ["schema", "schemas/b.json"],
      ["schema", "schemas/c.json"],
      ["schema", "schemas/d.json"],
      ["prompt", "prompts/a.md"],
      ["prompt", "prompts/b.md"],
    ],
  })),
  ...Array.from({ length: 7 }, (_, index) => ({
    id: `skill-${index}`,
    kind: "skill",
    contentKinds: ["skill_md"],
    assets: [],
  })),
  { id: "soul-0", kind: "soul", contentKinds: ["soul_md"], assets: [] },
]

const MEMBER_IDS = new Set(MEMBERS.map((member) => member.id))
const BODY = new TextEncoder().encode("stored-bytes")

mock.module("@/lib/http/api", {
  namedExports: {
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 500 })
    },
  },
})

// The member table the real `authorizeArtifactRead` reads. Matching all four
// conditions rather than just the ids keeps the organization scoping honest.
mock.module("@/lib/db", {
  namedExports: {
    prisma: {
      loadoutMember: {
        findFirst: async ({ where }) => {
          const belongs =
            where.loadoutId === LOADOUT &&
            where.loadout?.organizationId === ORG &&
            where.artifact?.organizationId === ORG &&
            MEMBER_IDS.has(where.artifactId)
          return belongs ? { id: `member-${where.artifactId}` } : null
        },
      },
    },
  },
})

mock.module("@/lib/private-artifacts/content", {
  namedExports: {
    CONTENT_MEDIA_TYPES: {
      skill_md: "text/markdown; charset=utf-8",
      soul_md: "text/markdown; charset=utf-8",
      wasm: "application/wasm",
      capabilities: "application/json",
      manifest_toml: "application/toml; charset=utf-8",
      bundle_zip: "application/zip",
      readme_md: "text/markdown; charset=utf-8",
    },
    HUB_ONLY_CONTENT_KINDS: new Set(["readme_md"]),
    getArtifactContentMetadata: async (organizationId, artifactId, kind) => ({
      storageKey: `private-artifacts/${organizationId}/${artifactId}/${kind}`,
      sizeBytes: BODY.length,
    }),
    parseContentKind: (value) => value,
  },
})

mock.module("@/lib/private-artifacts/assets", {
  namedExports: {
    ASSET_MEDIA_TYPES: {
      schema: "application/json",
      prompt: "text/markdown; charset=utf-8",
    },
    parseAssetKind: (value) => value,
    getArtifactAssetMetadata: async (
      organizationId,
      artifactId,
      kind,
      path
    ) => ({
      storageKey: `private-artifacts/${organizationId}/${artifactId}/assets/${kind}/${path}`,
      sizeBytes: BODY.length,
    }),
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    getObjectStream: async () => Readable.from([Buffer.from(BODY)]),
    getPresignedDownloadUrl: async () => {
      throw new Error("the agent-facing routes must never presign a URL (C5)")
    },
  },
})

// Stands in for the multi-entry builder (task 4.1, another workstream): the
// only thing this test needs from it is the set of URLs an install walks, and
// those URL shapes are the routes' own contract.
mock.module("@/lib/private-artifacts/manifest", {
  namedExports: {
    buildPrivateArtifactManifest: async ({ token }) => ({
      members: MEMBERS.map((member) => ({
        id: member.id,
        content: member.contentKinds.map(
          (kind) =>
            `${BASE_URL}/api/private-artifacts/${member.id}/content/${kind}/${encodeURIComponent(token)}`
        ),
        assets: member.assets.map(
          ([kind, path]) =>
            `${BASE_URL}/api/private-artifacts/${member.id}/asset/${kind}/${encodeURIComponent(token)}/${path}`
        ),
      })),
    }),
  },
})

mock.module("@/lib/catalog/manifest-signing.server", {
  namedExports: { signDocument: (document) => document },
})

class CatalogOriginError extends Error {}
mock.module("@/lib/catalog/catalog-origin", {
  namedExports: {
    CatalogOriginError,
    requireCatalogOriginBaseUrl: () => BASE_URL,
  },
})

const { mintLoadoutToken, mintArtifactToken } = await import(
  "@/lib/private-artifacts/token"
)
const { GET: getManifest } = await import(
  "@/app/api/private-artifacts/manifest/[token]/route.ts"
)
const { GET: getContent } = await import(
  "@/app/api/private-artifacts/[id]/content/[kind]/[token]/route.ts"
)
const { GET: getAsset } = await import(
  "@/app/api/private-artifacts/[id]/asset/[kind]/[token]/[...path]/route.ts"
)

/** One client, one IP, for the whole install -- as a real agent would be. */
function agentRequest() {
  return new Request("http://localhost/x", {
    headers: { "x-real-ip": CLIENT_IP },
  })
}

const CONTENT_URL = /\/api\/private-artifacts\/([^/]+)\/content\/([^/]+)\/(.+)$/
const ASSET_URL =
  /\/api\/private-artifacts\/([^/]+)\/asset\/([^/]+)\/([^/]+)\/(.+)$/

async function fetchContent(url) {
  const [, id, kind, token] = CONTENT_URL.exec(url)
  return getContent(agentRequest(), {
    params: Promise.resolve({ id, kind, token: decodeURIComponent(token) }),
  })
}

async function fetchAsset(url) {
  const [, id, kind, token, path] = ASSET_URL.exec(url)
  return getAsset(agentRequest(), {
    params: Promise.resolve({
      id,
      kind,
      token: decodeURIComponent(token),
      path: path.split("/"),
    }),
  })
}

test("task 8.6: a twenty-member install is served end to end without a 429", async () => {
  const token = mintLoadoutToken({
    organizationId: ORG,
    loadoutId: LOADOUT,
    ttlSeconds: 900,
  })

  const manifestResponse = await getManifest(agentRequest(), {
    params: Promise.resolve({ token }),
  })
  assert.equal(manifestResponse.status, 200)
  const document = await manifestResponse.json()
  assert.equal(document.members.length, 20)

  let requests = 1
  for (const member of document.members) {
    for (const url of member.content) {
      const response = await fetchContent(url)
      assert.equal(
        response.status,
        200,
        `${url} answered ${response.status} (429 means the budget refused a legal install)`
      )
      requests += 1
    }
    for (const url of member.assets) {
      const response = await fetchAsset(url)
      assert.equal(response.status, 200, `${url} answered ${response.status}`)
      requests += 1
    }
  }

  // 1 manifest + 12 tools x (3 content + 6 assets) + 8 documents = 117, all on
  // one token inside one window. The assertion is on the shape of the number,
  // not the number itself: any sequence past 30 is one the pre-loadout,
  // token-keyed budget would have refused partway through.
  assert.equal(requests, 117)
  assert.ok(
    requests > 30,
    "the fixture must exceed the single-artifact budget, or this proves nothing"
  )
})

test("task 8.6: per-member keying widens the budget without removing it", async () => {
  const token = mintLoadoutToken({
    organizationId: ORG,
    loadoutId: LOADOUT,
    ttlSeconds: 900,
  })
  const url = `${BASE_URL}/api/private-artifacts/tool-0/content/wasm/${token}`

  // The content budget is 30 per member per minute, and the previous test
  // already spent three of tool-0's on the same key (same IP, same token, same
  // member). Draining the rest must still end in a 429: keying per member
  // sizes the protection to the work, it does not switch it off.
  let statuses = []
  for (let index = 0; index < 40; index += 1) {
    statuses.push((await fetchContent(url)).status)
  }

  assert.ok(
    statuses.includes(429),
    "a member that keeps asking past its own budget must still be throttled"
  )
  // And the throttling is that member's alone -- a sibling still installs.
  const sibling = await fetchContent(
    `${BASE_URL}/api/private-artifacts/tool-1/content/wasm/${token}`
  )
  assert.equal(sibling.status, 200)
})

test("task 8.5: the install token reads members only, not the rest of the organization", async () => {
  const token = mintLoadoutToken({
    organizationId: ORG,
    loadoutId: LOADOUT,
    ttlSeconds: 900,
  })

  // Same organization, same valid token, artifact not in this loadout.
  const outsider = await fetchContent(
    `${BASE_URL}/api/private-artifacts/not-a-member/content/wasm/${token}`
  )
  assert.equal(outsider.status, 403)

  const outsiderAsset = await fetchAsset(
    `${BASE_URL}/api/private-artifacts/not-a-member/asset/schema/${token}/schemas/a.json`
  )
  assert.equal(outsiderAsset.status, 403)

  // And the widening does not run backwards: a single-artifact token for one
  // member cannot read a sibling member of the loadout it belongs to.
  const narrow = mintArtifactToken({
    organizationId: ORG,
    artifactId: "tool-0",
    ttlSeconds: 900,
  })
  const sibling = await fetchContent(
    `${BASE_URL}/api/private-artifacts/tool-2/content/wasm/${narrow}`
  )
  assert.equal(sibling.status, 403)
})
