import { readRepositoryImageAsset } from "@/lib/catalog/repository-assets.server"
import { findRepoRoot } from "@/lib/catalog/readers.server"

type RepositoryAssetRouteContext = {
  params: Promise<{
    kind: string
    slug: string
    assetPath: string[]
  }>
}

export async function GET(
  _request: Request,
  { params }: RepositoryAssetRouteContext
) {
  const { kind, slug, assetPath } = await params
  const asset = await readRepositoryImageAsset(
    await findRepoRoot(),
    kind,
    slug,
    assetPath
  )

  if (!asset) {
    return new Response(null, { status: 404 })
  }

  return new Response(asset.bytes.buffer as ArrayBuffer, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Content-Length": String(asset.bytes.byteLength),
      "Content-Type": asset.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
