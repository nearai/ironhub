import { getMarketplaceCatalogItem } from "@/lib/catalog/server"
import {
  markdownNotFound,
  markdownResponse,
  renderCatalogItemMarkdown,
} from "@/lib/discovery/markdown"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const item = await getMarketplaceCatalogItem(slug)

  if (!item) return markdownNotFound()

  return markdownResponse(
    renderCatalogItemMarkdown(item),
    `/marketplace/${item.slug}`
  )
}
