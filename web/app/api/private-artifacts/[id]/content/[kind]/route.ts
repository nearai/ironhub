import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import {
  parseContentKind,
  storeArtifactContent,
} from "@/lib/private-artifacts/content"

type Params = {
  params: Promise<{ id: string; kind: string }>
}

const MAX_CONTENT_BYTES = 5 * 1024 * 1024

export async function PUT(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    const bytes = Buffer.from(await request.arrayBuffer())
    if (bytes.length === 0) {
      throw new Response("Empty content body", { status: 400 })
    }
    if (bytes.length > MAX_CONTENT_BYTES) {
      throw new Response("Content exceeds the 5MB limit", { status: 413 })
    }

    const content = await storeArtifactContent(
      organizationId,
      id,
      contentKind,
      bytes
    )

    return Response.json({ content }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
