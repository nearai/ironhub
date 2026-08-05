import { getMarketplaceCatalog } from "@/lib/catalog/server"
import {
  markdownResponse,
  renderMarketplaceIndexMarkdown,
} from "@/lib/discovery/markdown"

export const dynamic = "force-dynamic"

export async function GET() {
  const { items } = await getMarketplaceCatalog()
  return markdownResponse(renderMarketplaceIndexMarkdown(items), "/marketplace")
}
