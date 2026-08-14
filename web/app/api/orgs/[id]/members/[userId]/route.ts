import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  assertSameOriginRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { changeMemberRole, removeMember } from "@/lib/orgs/service"

type Params = {
  params: Promise<{ id: string; userId: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { id, userId } = await params
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const member = await changeMemberRole(id, user.id, userId, readString(body, "role"))

    return Response.json({ member })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { id, userId } = await params
    assertSameOriginRequest(request)
    await removeMember(id, user.id, userId)

    return Response.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
