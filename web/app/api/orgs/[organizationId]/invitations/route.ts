import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import {
  createInvitationForIdentifier,
  listOrgInvitations,
} from "@/lib/orgs/invitations"

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

/**
 * Lists this organization's invitations.
 *
 * Preferred over `authClient.organization.listInvitations`, which returns the
 * stored address and nothing else: a wallet user's address is a
 * `temp-…@<app url>` placeholder, so this route resolves each invitation back
 * to the NEAR account id it was actually addressed to.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { user } = await requireAuthSession()
    const { organizationId } = await params

    const invitations = await listOrgInvitations(organizationId, user.id)

    return Response.json({ invitations })
  } catch (error) {
    return handleApiError(error)
  }
}
