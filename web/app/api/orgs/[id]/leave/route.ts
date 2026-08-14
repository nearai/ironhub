import { headers } from "next/headers"

import { auth } from "@/lib/auth/server"
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
    const result = await leaveOrganization(id, user.id, session.activeOrganizationId)

    // Only touch the active-org cookie if the org just left was actually
    // the caller's active one; auth.api.setActiveOrganization handles both
    // the DB write and the cookie refresh (see service.ts doc).
    if (result.wasActive) {
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: result.fallbackOrganizationId },
      })
    }

    return Response.json({ ok: true, activeOrganizationId: result.fallbackOrganizationId })
  } catch (error) {
    return handleApiError(error)
  }
}
