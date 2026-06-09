import { generateSharedKey } from "@/lib/agent-installations/crypto"
import { requireAuthSession } from "@/lib/auth/session"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"

export async function POST(request: Request) {
  try {
    await requireAuthSession()
    assertSameOriginRequest(request)

    return Response.json({ sharedKey: generateSharedKey() })
  } catch (error) {
    return handleApiError(error)
  }
}
