// The agent-facing read path for a private artifact's per-kind content.
//
// THIS ROUTE MUST NEVER REDIRECT. Its session-authenticated sibling
// (`../route.ts`, no `[token]` segment) answers `wasm` and `bundle_zip` with a
// 302 to a presigned object-store URL, and that divergence is deliberate, not
// an oversight in one of the two.
//
// A browser follows a cross-host redirect without further ado, so the sibling
// saves relaying tens of megabytes through this process. The agent follows
// redirects too -- up to three -- but re-authorizes *every hop* against a
// network policy pinned to the single host of the original artifact URL
// (`ironclaw:crates/substrates/ironclaw_network/src/egress.rs`, and
// `network_policy_for_url_from_origin` in `ironhub/catalog.rs`). The hub's own
// host is the only one in that policy, so a 302 to object storage is denied at
// the first hop and the install fails with an egress error naming a host the
// operator never configured. That was design.md's D2, and it applied to every
// kind, not just the redirected ones -- which is why this route consults no
// `REDIRECT_CONTENT_KINDS` set at all rather than an emptied one. Streaming a
// 16MB wasm module through the app is the price, and installs are rare.
//
// The response is byte-exact per C6: no `Content-Encoding`, and
// `Content-Length` from the size recorded at write time, which is the same
// number the manifest advertises.
import { handleApiError } from "@/lib/http/api"
import {
  createRateLimiter,
  rateLimitExceededResponse,
  resolveClientIp,
} from "@/lib/http/rate-limit"
import { capabilitiesStubBytes } from "@/lib/catalog/ironclaw-contract"
import {
  CONTENT_MEDIA_TYPES,
  HUB_ONLY_CONTENT_KINDS,
  getArtifactContentMetadata,
  parseContentKind,
} from "@/lib/private-artifacts/content"
import { relayBytes, relayStoredObject } from "@/lib/private-artifacts/relay"
import {
  authorizeArtifactRead,
  verifyArtifactToken,
} from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string; kind: string; token: string }>
}

// Public route rate limit, keyed by client IP, token, and the artifact being
// read -- the last of those is what makes this budget survive a loadout.
//
// 30 is sized for one artifact's four content kinds (design.md, "Rate limits
// are keyed per member"): a twenty-member loadout fetches the manifest plus
// every member's content and assets, which passes thirty requests in the first
// minute, and a token-keyed budget would abort the install partway through
// with a 429 that looks like a hub fault. Keying per member sizes the budget
// to the work while leaving a single member capped exactly as it was.
//
// The `id` is caller-chosen and checked only after this point, so it does not
// tighten the budget against a flood -- but neither did the token, which is
// equally caller-chosen. The client IP is what carries that job, and the
// limiter's own key ceiling bounds the map.
const checkRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 })

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, kind, token } = await params

    const rateLimit = checkRateLimit(
      `content:${resolveClientIp(request)}:${token}:${id}`
    )
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const contentKind = parseContentKind(kind)

    // A hub-only kind has no agent-facing existence, and this is the only
    // route that would give it one. Keeping it out of the manifest is what
    // stops an agent from *finding* a soul's README; refusing it here is what
    // stops one from asking for it anyway. The kind is a fixed enum, so the
    // URL is guessable by anything holding a valid install token -- "never
    // sent to an agent" is what the workspace promises an author, and an
    // omission the caller can route around is not that promise.
    //
    // 404 rather than 403: to an agent this URL names a document that does
    // not exist on the published artifact, which is exactly what it is. A 403
    // would report an authorization decision about a resource whose existence
    // is not an agent's to learn.
    if (HUB_ONLY_CONTENT_KINDS.has(contentKind)) {
      throw new Response(`Artifact has no published content: ${kind}`, {
        status: 404,
      })
    }

    const claims = verifyArtifactToken(token)
    // A single-artifact token still authorizes exactly its own artifact; a
    // loadout-scoped one authorizes the members of that one loadout, read from
    // the member table on every request. See `authorizeArtifactRead`.
    await authorizeArtifactRead(claims, id)

    let content
    try {
      content = await getArtifactContentMetadata(
        claims.organizationId,
        id,
        contentKind
      )
    } catch (error) {
      // UPSTREAM WORKAROUND (see CAPABILITIES_STUB_TEXT): a manifest v3 tool
      // ships no `*.capabilities.json`, but the entry cannot omit the field,
      // so the manifest advertises the stub's size and digest at this URL.
      // Served from the constant rather than from a row written at ingest, so
      // there is exactly one place the published digest and the served bytes
      // can come from. Only a 404 falls through -- a storage or authorization
      // failure must not be answered with two bytes of `{}`.
      //
      // `getArtifactContentMetadata` answers 404 for "no capabilities row" and
      // for "no such artifact in this org" alike, so a still-valid token whose
      // artifact has since been deleted gets the stub rather than a 404. That
      // is deliberate, not an oversight. The stub is a constant with nothing
      // artifact-derived in it, the token has already been verified and
      // authorized for this artifact above -- as the token's own artifact, or
      // as a member of the one loadout it is scoped to -- and the manifest
      // route 404s for a deleted artifact, so an agent never reaches this URL
      // for one in any
      // real flow. Distinguishing the two cases would cost an extra query on
      // every capabilities read to change nothing an attacker could not
      // already infer from the token verifying at all.
      if (
        contentKind === "capabilities" &&
        error instanceof Response &&
        error.status === 404
      ) {
        return relayBytes(
          capabilitiesStubBytes(),
          CONTENT_MEDIA_TYPES.capabilities
        )
      }
      throw error
    }

    return await relayStoredObject({
      storageKey: content.storageKey,
      sizeBytes: content.sizeBytes,
      contentType: CONTENT_MEDIA_TYPES[contentKind],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
