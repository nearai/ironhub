import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import {
  CONTENT_MEDIA_TYPES,
  getArtifactContent,
  parseContentKind,
  storeArtifactContent,
} from "@/lib/private-artifacts/content"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

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

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    const token = new URL(request.url).searchParams.get("token")
    if (!token) {
      throw new Response("Missing artifact token", { status: 401 })
    }
    const claims = verifyArtifactToken(token)
    if (claims.artifactId !== id) {
      throw new Response("Token does not match artifact", { status: 403 })
    }

    const content = await getArtifactContent(
      claims.organizationId,
      id,
      contentKind
    )

    return new Response(new Uint8Array(content.bytes), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_MEDIA_TYPES[contentKind],
        "Content-Length": String(content.sizeBytes),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
