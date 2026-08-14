import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { createInvitation, listOrgInvitations } from "@/lib/orgs/invitations"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { id } = await params
    const invitations = await listOrgInvitations(id, user.id)

    return Response.json({ invitations })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { id } = await params
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const invitation = await createInvitation(
      id,
      user.id,
      readString(body, "email"),
      readString(body, "role")
    )

    return Response.json({ invitation }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
