import {
  createAgentInstallation,
  listAgentInstallations,
} from "@/lib/agent-installations/service"
import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"

export async function GET() {
  try {
    const { user } = await requireAuthSession()
    const installations = await listAgentInstallations(user.id)

    return Response.json({ installations })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const installation = await createAgentInstallation(user.id, {
      label: readString(body, "label"),
      agentUrl: readString(body, "agentUrl"),
      sharedKey: readString(body, "sharedKey"),
      isDefault: body.isDefault === true,
    })

    return Response.json({ installation }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
