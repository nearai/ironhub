import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { getPrivateArtifact } from "@/lib/private-artifacts/service"
import { mintArtifactToken } from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string }>
}

const MANIFEST_TOKEN_TTL_SECONDS = 60 * 60

function resolveBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/+$/, "")

  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id } = await params

    // Ensures the artifact exists and belongs to the active org (404
    // otherwise) before minting a token for it.
    await getPrivateArtifact(organizationId, id)

    const token = mintArtifactToken({
      organizationId,
      artifactId: id,
      ttlSeconds: MANIFEST_TOKEN_TTL_SECONDS,
    })

    const manifestUrl = `${resolveBaseUrl(request)}/api/private-artifacts/manifest/${token}`

    return Response.json({ token, manifestUrl })
  } catch (error) {
    return handleApiError(error)
  }
}
