import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { publishPrivateArtifact } from "@/lib/private-artifacts/service"

type Params = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id } = await params

    const artifact = await publishPrivateArtifact(organizationId, id)

    return Response.json({ artifact })
  } catch (error) {
    return handleApiError(error)
  }
}
