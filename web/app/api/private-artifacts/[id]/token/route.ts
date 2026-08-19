import { requireActiveOrganization } from "@/lib/auth/org-context"
import {
  CatalogOriginError,
  requireCatalogOriginBaseUrl,
} from "@/lib/catalog/catalog-origin"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { assertArtifactContentComplete } from "@/lib/private-artifacts/service"
import { mintArtifactToken } from "@/lib/private-artifacts/token"
import { assertPrivateArtifactPublishable } from "@/lib/private-artifacts/verification"

type Params = {
  params: Promise<{ id: string }>
}

const MANIFEST_TOKEN_TTL_SECONDS = 60 * 60

export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOriginRequest(request)
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params

    // Ensures the artifact exists, belongs to the active org (404
    // otherwise), and has all content required by its type — otherwise the
    // resulting manifest fetch would fail with a 409.
    await assertArtifactContentComplete(organizationId, id)

    // Matches the manifest route's requirement exactly: no request-derived
    // fallback, since a Host-header-derived URL here can only ever produce a
    // link the agent refuses. Validated, not merely present -- an install
    // link built on an origin the agent will not accept is a dead link that
    // looks live.
    const baseUrl = requireCatalogOriginBaseUrl()

    // The link is an offer to install, so it is gated on the same contract
    // check the artifact screen reports: an entry the agent cannot parse or
    // install must not be handed out as a URL that appears to work.
    await assertPrivateArtifactPublishable(organizationId, id, { baseUrl })

    const token = mintArtifactToken({
      organizationId,
      artifactId: id,
      ttlSeconds: MANIFEST_TOKEN_TTL_SECONDS,
    })

    const manifestUrl = `${baseUrl}/api/private-artifacts/manifest/${token}`

    return Response.json({ token, manifestUrl })
  } catch (error) {
    // A misconfigured catalog origin is a deployment fault, not a bad request.
    return handleApiError(
      error instanceof CatalogOriginError
        ? new Response(error.message, { status: 500 })
        : error
    )
  }
}
