import { handleApiError } from "@/lib/http/api"
// integration: minimal rate-limit guard added by wt-artifact-api; the body
// of this route is being rewritten by wt-storage for S3-backed downloads.
// Keep this diff small — only the two lines marked below were added.
import {
  createRateLimiter,
  rateLimitExceededResponse,
  resolveClientIp,
} from "@/lib/http/rate-limit"
import {
  CONTENT_MEDIA_TYPES,
  getArtifactContent,
  parseContentKind,
} from "@/lib/private-artifacts/content"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string; kind: string; token: string }>
}

const checkRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 }) // added

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, kind, token } = await params

    // added: public route rate limit, keyed by token then IP
    const rateLimit = checkRateLimit(`content:${token || resolveClientIp(request)}`)
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const contentKind = parseContentKind(kind)

    const claims = verifyArtifactToken(token)
    if (claims.artifactId !== id) {
      throw new Response("Token does not match artifact", { status: 403 })
    }

    const content = await getArtifactContent(
      claims.organizationId,
      id,
      contentKind
    )

    return new Response(new Uint8Array(content.bytes), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_MEDIA_TYPES[contentKind],
        "Content-Length": String(content.sizeBytes),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
