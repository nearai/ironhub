import { requireAuthSession } from "@/lib/auth/session"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { leaveOrganization } from "@/lib/orgs/service"

type Params = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { user, session } = await requireAuthSession()
    assertSameOriginRequest(request)
    const { id } = await params
    await leaveOrganization(id, user.id, session.id)

    return Response.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
