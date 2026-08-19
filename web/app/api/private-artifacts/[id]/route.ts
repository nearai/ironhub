import { requireActiveOrganization } from "@/lib/auth/org-context"
import {
  assertJsonMutationRequest,
  assertSameOriginRequest,
  handleApiError,
  parseJsonObject,
} from "@/lib/http/api"
import {
  MUTABLE_ARTIFACT_FIELDS,
  deletePrivateArtifact,
  getPrivateArtifact,
  updatePrivateArtifact,
} from "@/lib/private-artifacts/service"
import { deleteByPrefix } from "@/lib/storage"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params
    const artifact = await getPrivateArtifact(organizationId, id)

    return Response.json({ artifact })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertJsonMutationRequest(request)
    const { id } = await params
    const body = parseJsonObject(await request.json())

    const unknownFields = Object.keys(body).filter(
      (key) => !(MUTABLE_ARTIFACT_FIELDS as readonly string[]).includes(key)
    )
    if (unknownFields.length > 0) {
      throw new Response(
        `Unknown or immutable field(s): ${unknownFields.join(", ")}`,
        { status: 400 }
      )
    }

    const patch: {
      title?: string
      description?: string | null
      visibility?: string
      sourceUrl?: string | null
      category?: string | null
    } = {}

    if ("title" in body) patch.title = assertOptionalString(body.title, "title")
    if ("description" in body)
      patch.description = assertNullableString(body.description, "description")
    if ("visibility" in body)
      patch.visibility = assertOptionalString(body.visibility, "visibility")
    if ("sourceUrl" in body)
      patch.sourceUrl = assertNullableString(body.sourceUrl, "sourceUrl")
    if ("category" in body)
      patch.category = assertNullableString(body.category, "category")

    const artifact = await updatePrivateArtifact(organizationId, id, patch)

    return Response.json({ artifact })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id } = await params

    await deletePrivateArtifact(organizationId, id)

    try {
      await deleteByPrefix(`private-artifacts/${organizationId}/${id}/`)
    } catch (storageError) {
      // S3 cleanup failure is non-fatal: orphaned objects are harmless and
      // can be swept later by key prefix.
      console.error(
        `Failed to clean up storage for artifact ${id} (org ${organizationId}):`,
        storageError
      )
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}

function assertOptionalString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Response(`${field} must be a string`, { status: 400 })
  }
  return value
}

function assertNullableString(value: unknown, field: string): string | null {
  if (value === null) return null
  if (typeof value !== "string") {
    throw new Response(`${field} must be a string or null`, { status: 400 })
  }
  return value
}
