import { requireAuthSession } from "@/lib/auth/session"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { cancelInvitation } from "@/lib/orgs/invitations"

type Params = {
  params: Promise<{ invitationId: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    assertSameOriginRequest(request)
    const { invitationId } = await params
    const invitation = await cancelInvitation(invitationId, user.id)

    return Response.json({ invitation })
  } catch (error) {
    return handleApiError(error)
  }
}
