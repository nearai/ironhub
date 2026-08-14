import { handleApiError } from "@/lib/http/api"
import {
  getArtifactContentMetadata,
  parseContentKind,
} from "@/lib/private-artifacts/content"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"
import { getPresignedDownloadUrl } from "@/lib/storage"

type Params = {
  params: Promise<{ id: string; kind: string; token: string }>
}

const PRESIGNED_URL_TTL_SECONDS = 300

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, kind, token } = await params
    const contentKind = parseContentKind(kind)

    const claims = verifyArtifactToken(token)
    if (claims.artifactId !== id) {
      throw new Response("Token does not match artifact", { status: 403 })
    }

    const content = await getArtifactContentMetadata(
      claims.organizationId,
      id,
      contentKind
    )

    const url = await getPresignedDownloadUrl(
      content.storageKey,
      PRESIGNED_URL_TTL_SECONDS
    )

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
