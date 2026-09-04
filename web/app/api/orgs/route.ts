import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readString,
} from "@/lib/http/api"
import { createOrganization, listMyOrganizations } from "@/lib/orgs/service"

export async function GET() {
  try {
    const { user } = await requireAuthSession()
    const organizations = await listMyOrganizations(user.id)

    return Response.json({ organizations })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const organization = await createOrganization(
      user.id,
      readString(body, "name")
    )

    return Response.json({ organization }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
