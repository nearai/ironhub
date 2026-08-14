import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { renameOrganization } from "@/lib/orgs/service"

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { id } = await params
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const organization = await renameOrganization(id, user.id, readString(body, "name"))

    return Response.json({ organization })
  } catch (error) {
    return handleApiError(error)
  }
}
