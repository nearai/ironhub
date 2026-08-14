import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { setActiveOrganization } from "@/lib/orgs/service"

export async function POST(request: Request) {
  try {
    const { user, session } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const organizationId = readString(body, "organizationId")
    await setActiveOrganization(user.id, session.id, organizationId)

    return Response.json({ activeOrganizationId: organizationId })
  } catch (error) {
    return handleApiError(error)
  }
}
