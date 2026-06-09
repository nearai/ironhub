import {
  deleteAgentInstallation,
  updateAgentInstallation,
} from "@/lib/agent-installations/service"
import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  assertSameOriginRequest,
  handleApiError,
  parseJsonObject,
  readOptionalString,
} from "@/lib/http/api"

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const { id } = await params
    const body = parseJsonObject(await request.json())
    const installation = await updateAgentInstallation(user.id, id, {
      label: readOptionalString(body, "label"),
      agentUrl: readOptionalString(body, "agentUrl"),
      sharedKey: readOptionalString(body, "sharedKey"),
      isDefault: body.isDefault === true ? true : undefined,
    })

    return Response.json({ installation })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    assertSameOriginRequest(request)
    const { id } = await params
    await deleteAgentInstallation(user.id, id)

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
