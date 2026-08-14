import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { assertArtifactContentComplete } from "@/lib/private-artifacts/service"
import { mintArtifactToken } from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string }>
}

const MANIFEST_TOKEN_TTL_SECONDS = 60 * 60

function resolveBaseUrl(): string {
  // Matches the manifest route's requirement exactly: no request-derived
  // fallback, since a Host-header-derived URL here can only ever produce a
  // dead link (the manifest route itself hard-requires this env var and
  // 500s without it).
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (!configured) {
    throw new Response("Application URL is not configured", { status: 500 })
  }
  return configured.replace(/\/+$/, "")
}

export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOriginRequest(request)
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params

    // Ensures the artifact exists, belongs to the active org (404
    // otherwise), and has all content required by its type — otherwise the
    // resulting manifest fetch would fail with a 409.
    await assertArtifactContentComplete(organizationId, id)

    const baseUrl = resolveBaseUrl()

    const token = mintArtifactToken({
      organizationId,
      artifactId: id,
      ttlSeconds: MANIFEST_TOKEN_TTL_SECONDS,
    })

    const manifestUrl = `${baseUrl}/api/private-artifacts/manifest/${token}`

    return Response.json({ token, manifestUrl })
  } catch (error) {
    return handleApiError(error)
  }
}
