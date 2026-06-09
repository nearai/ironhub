import { createInstallIntent } from "@/lib/agent-installations/service"
import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readOptionalString,
  readString,
} from "@/lib/http/api"

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const intent = await createInstallIntent({
      userId: user.id,
      slug: readString(body, "slug"),
      agentInstallationId: readOptionalString(body, "agentInstallationId"),
    })

    return Response.json(intent)
  } catch (error) {
    return handleApiError(error)
  }
}
