import { headers } from "next/headers"

import { auth } from "@/lib/auth/server"
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
    const result = await acceptInvitation(invitationId, user.id, user.email)

    // Use the CALLER's own request headers (their own session/device), not
    // a session row looked up by userId — an arbitrary session lookup would
    // update the wrong device's active org.
    if (setActive) {
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: result.organizationId },
      })
    }

    return Response.json({ invitation: result.invitation })
  } catch (error) {
    return handleApiError(error)
  }
}
