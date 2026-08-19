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
  getArtifactContentMetadata,
  parseContentKind,
} from "@/lib/private-artifacts/content"
import { relayBytes, relayStoredObject } from "@/lib/private-artifacts/relay"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string; kind: string; token: string }>
}

// added: public route rate limit, keyed by client IP (scoped by token)
const checkRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 })

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, kind, token } = await params

    const rateLimit = checkRateLimit(
      `content:${resolveClientIp(request)}:${token}`
    )
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const contentKind = parseContentKind(kind)

    const claims = verifyArtifactToken(token)
    if (claims.artifactId !== id) {
      throw new Response("Token does not match artifact", { status: 403 })
    }

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
      // artifact-derived in it, the token is already scoped to one artifact in
      // one org and has been verified above, and the manifest route 404s for a
      // deleted artifact -- so an agent never reaches this URL for one in any
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
