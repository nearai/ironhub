import { requireActiveOrganization } from "@/lib/auth/org-context"
import { handleApiError } from "@/lib/http/api"
import { getPrivateArtifact } from "@/lib/private-artifacts/service"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params
    const artifact = await getPrivateArtifact(organizationId, id)

    return Response.json({ artifact })
  } catch (error) {
    return handleApiError(error)
  }
}
