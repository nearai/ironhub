import { getCollectionBundle } from "@/lib/catalog/collections"
import { getMarketplaceCatalog } from "@/lib/catalog/server"
import {
  markdownNotFound,
  markdownResponse,
  renderCollectionMarkdown,
} from "@/lib/discovery/markdown"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { items } = await getMarketplaceCatalog()
  const collection = getCollectionBundle(items, slug)

  if (!collection) return markdownNotFound()

  return markdownResponse(
    renderCollectionMarkdown(collection),
    `/collections/${collection.slug}`
  )
}
