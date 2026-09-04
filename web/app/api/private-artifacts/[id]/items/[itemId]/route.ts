import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { removeLoadoutMember } from "@/lib/private-artifacts/loadout-composition"

type Params = {
  params: Promise<{ id: string; itemId: string }>
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, itemId } = await params

    // `itemId` on the way in, member id on the way down: the rename stops at
    // this boundary, for the reasons the sibling route's header sets out.
    await removeLoadoutMember(organizationId, id, itemId)

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
