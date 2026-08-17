import { requireActiveOrganization } from "@/lib/auth/org-context"
import { handleApiError } from "@/lib/http/api"
import { getArtifactChecks } from "@/lib/private-artifacts/service"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params

    const result = await getArtifactChecks(organizationId, id)

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
