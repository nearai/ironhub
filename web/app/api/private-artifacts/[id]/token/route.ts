import { requireActiveOrganization } from "@/lib/auth/org-context"
import {
  CatalogOriginError,
  requireCatalogOriginBaseUrl,
} from "@/lib/catalog/catalog-origin"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import {
  assertArtifactContentComplete,
  getPrivateArtifact,
} from "@/lib/private-artifacts/service"
import { mintInstallTokenForArtifact } from "@/lib/private-artifacts/token"
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

    // Read before it is checked, because the token this route mints depends on
    // what the artifact *is*: a loadout is one credential for every member,
    // anything else is one credential for itself. Org-scoped, so a
    // cross-organization id is a 404 here exactly as it is below.
    const artifact = await getPrivateArtifact(organizationId, id)

    // Ensures the artifact exists, belongs to the active org (404
    // otherwise), and has all content required by its type — otherwise the
    // resulting manifest fetch would fail with a 409.
    //
    // A loadout stores no content of its own, so this gate has no question to
    // ask of one and refuses it as an unsupported type. That refusal is
    // correct today -- loadout install delivery is blocked on IronClaw asks 4
    // and 5 -- and it is upstream of the mint below, so no loadout reaches it
    // yet. When the gate learns about loadouts, the mint is already right.
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

    const token = mintInstallTokenForArtifact(artifact, {
      organizationId,
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
