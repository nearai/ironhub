import { signManifest } from "@/lib/catalog/manifest-signing.server"
import { handleApiError } from "@/lib/http/api"
import { buildPrivateArtifactManifest } from "@/lib/private-artifacts/manifest"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params

    const claims = verifyArtifactToken(token)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      throw new Response("Application URL is not configured", { status: 500 })
    }

    const manifest = await buildPrivateArtifactManifest({
      organizationId: claims.organizationId,
      artifactId: claims.artifactId,
      token,
      baseUrl,
      generatedAt: new Date().toISOString(),
    })

    return Response.json(signManifest(manifest), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
