import { getMarketplaceCatalogItem } from "@/lib/catalog/server"
import { summarizeDescription } from "@/lib/discovery/metadata"
import {
  renderSocialCard,
  socialImageContentType,
  socialImageSize,
} from "@/lib/discovery/social-card"

export const alt = "IronHub marketplace"
export const size = socialImageSize
export const contentType = socialImageContentType

export default async function MarketplaceOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = await getMarketplaceCatalogItem(slug)

  return renderSocialCard({
    title: item?.name || "IronHub Marketplace",
    label: item
      ? item.kind === "tool"
        ? "WebAssembly Tool"
        : "IronClaw Skill"
      : "Marketplace Entry",
    description: summarizeDescription(item?.description),
  })
}
