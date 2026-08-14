import { requireAuthSession } from "@/lib/auth/session"
import { handleApiError } from "@/lib/http/api"
import { listPendingInvitationsForEmail } from "@/lib/orgs/invitations"

export async function GET() {
  try {
    const { user } = await requireAuthSession()
    const invitations = await listPendingInvitationsForEmail(user.email)

    return Response.json({ invitations })
  } catch (error) {
    return handleApiError(error)
  }
}
