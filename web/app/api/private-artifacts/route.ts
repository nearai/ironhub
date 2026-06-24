import { requireActiveOrganization } from "@/lib/auth/org-context"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readOptionalString,
  readString,
} from "@/lib/http/api"
import {
  createPrivateArtifact,
  listPrivateArtifacts,
} from "@/lib/private-artifacts/service"

export async function GET() {
  try {
    const { organizationId } = await requireActiveOrganization()
    const artifacts = await listPrivateArtifacts(organizationId)

    return Response.json({ artifacts })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { organizationId, userId } = await requireActiveOrganization()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const artifact = await createPrivateArtifact(organizationId, userId, {
      type: readString(body, "type"),
      name: readString(body, "name"),
      title: readString(body, "title"),
      version: readString(body, "version"),
      visibility: readOptionalString(body, "visibility"),
      description: readOptionalString(body, "description"),
      sourceUrl: readOptionalString(body, "sourceUrl"),
    })

    return Response.json({ artifact }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
