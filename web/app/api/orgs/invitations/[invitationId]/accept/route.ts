import { requireAuthSession } from "@/lib/auth/session"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { acceptInvitation } from "@/lib/orgs/invitations"

type Params = {
  params: Promise<{ invitationId: string }>
}

async function readSetActive(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    return false
  }

  const text = await request.text()
  if (!text) return false

  const body = JSON.parse(text)
  return Boolean(body && typeof body === "object" && body.setActive === true)
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    assertSameOriginRequest(request)
    const { invitationId } = await params
    const setActive = await readSetActive(request)
    const invitation = await acceptInvitation(
      invitationId,
      user.id,
      user.email,
      setActive
    )

    return Response.json({ invitation })
  } catch (error) {
    return handleApiError(error)
  }
}
