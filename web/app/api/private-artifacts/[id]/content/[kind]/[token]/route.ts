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
  getArtifactContentMetadata,
  parseContentKind,
} from "@/lib/private-artifacts/content"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"
import { getPresignedDownloadUrl } from "@/lib/storage"

type Params = {
  params: Promise<{ id: string; kind: string; token: string }>
}

const PRESIGNED_URL_TTL_SECONDS = 300

const checkRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 })

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, kind, token } = await params

    // added: public route rate limit, keyed by client IP (scoped by token)
    const rateLimit = checkRateLimit(`content:${resolveClientIp(request)}:${token}`)
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const contentKind = parseContentKind(kind)

    const claims = verifyArtifactToken(token)
    if (claims.artifactId !== id) {
      throw new Response("Token does not match artifact", { status: 403 })
    }

    const content = await getArtifactContentMetadata(
      claims.organizationId,
      id,
      contentKind
    )

    const url = await getPresignedDownloadUrl(
      content.storageKey,
      PRESIGNED_URL_TTL_SECONDS
    )

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
