import { requireAuthSession } from "@/lib/auth/session"
import { handleApiError } from "@/lib/http/api"
import { listMembers } from "@/lib/orgs/service"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { id } = await params
    const members = await listMembers(id, user.id)

    return Response.json({ members })
  } catch (error) {
    return handleApiError(error)
  }
}
