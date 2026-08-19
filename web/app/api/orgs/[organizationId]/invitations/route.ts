import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { createInvitationForIdentifier } from "@/lib/orgs/invitations"

type Params = {
  params: Promise<{ organizationId: string }>
}

/**
 * Creates an invitation from an email address or a NEAR account id.
 *
 * BetterAuth's own `inviteMember` endpoint only understands emails, and
 * wallet users never type theirs — it is minted for them on first sign-in.
 * This route resolves either form to the address the invitation is stored
 * against, so both kinds of member can be invited by the identity they know.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const { organizationId } = await params
    const body = parseJsonObject(await request.json())

    const invitation = await createInvitationForIdentifier(
      organizationId,
      user.id,
      readString(body, "identifier"),
      readString(body, "role")
    )

    return Response.json({ invitation }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
