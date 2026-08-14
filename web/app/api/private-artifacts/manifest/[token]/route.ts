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

// Public route (no session): rate limit per token, falling back to IP.
const checkRateLimit = createRateLimiter({ limit: 30, windowMs: 60_000 })

export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params

    const rateLimitKey = `manifest:${token || resolveClientIp(request)}`
    const rateLimit = checkRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const claims = verifyArtifactToken(token)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      throw new Response("Application URL is not configured", { status: 500 })
    }

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
    return handleApiError(error)
  }
}
