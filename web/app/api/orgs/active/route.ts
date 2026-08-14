import { headers } from "next/headers"

import { auth } from "@/lib/auth/server"
import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { setActiveOrganization } from "@/lib/orgs/service"

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const organizationId = readString(body, "organizationId")

    // Verify membership with our own 403 first, then let BetterAuth's
    // server API perform the actual switch: it writes the session row AND
    // refreshes the signed session cookie via setSessionCookie. A raw
    // Prisma write to session.activeOrganizationId would be invisible to
    // getSessionFromCtx for up to 30 days because of session.cookieCache.
    await setActiveOrganization(user.id, organizationId)
    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId },
    })

    return Response.json({ activeOrganizationId: organizationId })
  } catch (error) {
    return handleApiError(error)
  }
}
