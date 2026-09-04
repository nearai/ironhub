import {
  CatalogOriginError,
  requireCatalogOriginBaseUrl,
} from "@/lib/catalog/catalog-origin"
import { signDocument } from "@/lib/catalog/manifest-signing.server"
import { handleApiError } from "@/lib/http/api"
import {
  createRateLimiter,
  rateLimitExceededResponse,
  resolveClientIp,
} from "@/lib/http/rate-limit"
import { buildPrivateArtifactManifest } from "@/lib/private-artifacts/manifest"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ token: string }>
}

// Public route (no session): rate limit per client IP, scoped by token so
// one IP brute-forcing many tokens still shares a single budget per IP.
//
// This is the one token-authorized read route that is NOT keyed per member,
// and that is because it has no member to key on: an install fetches this
// document once and then walks it, so a twenty-member loadout costs one
// request here and twenty members' worth on the content and asset routes,
// which is where design.md's "Rate limits are keyed per member" lands. Thirty
// manifest fetches a minute per token remains far more than any install needs.
const checkRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 })

export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params

    const rateLimitKey = `manifest:${resolveClientIp(request)}:${token}`
    const rateLimit = checkRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const claims = verifyArtifactToken(token)
    // Validated, not merely present. Every URL in the document below is built
    // on this value and re-checked by the agent against its configured catalog
    // origin (C1/C2); a value that cannot pass those rules produces a manifest
    // that signs cleanly and is refused, with an error naming the agent's
    // configuration rather than this setting.
    const baseUrl = requireCatalogOriginBaseUrl()

    const manifest = await buildPrivateArtifactManifest({
      organizationId: claims.organizationId,
      artifactId: claims.artifactId,
      token,
      baseUrl,
      generatedAt: new Date().toISOString(),
    })

    return Response.json(signDocument(manifest), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return handleApiError(asServerFault(error))
  }
}

/** A misconfigured catalog origin is a deployment fault, not a bad request. */
function asServerFault(error: unknown): unknown {
  return error instanceof CatalogOriginError
    ? new Response(error.message, { status: 500 })
    : error
}
