import { handleApiError } from "@/lib/http/api"
import {
  CONTENT_MEDIA_TYPES,
  getArtifactContent,
  parseContentKind,
} from "@/lib/private-artifacts/content"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string; kind: string; token: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, kind, token } = await params
    const contentKind = parseContentKind(kind)

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
