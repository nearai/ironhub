import { verifyAgentInstallation } from "@/lib/agent-installations/service"
import { requireAuthSession } from "@/lib/auth/session"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"

type Params = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    assertSameOriginRequest(request)
    const { id } = await params
    const installation = await verifyAgentInstallation(user.id, id)

    return Response.json({ installation })
  } catch (error) {
    return handleApiError(error)
  }
}
