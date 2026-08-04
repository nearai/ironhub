import {
  generateMarketplaceStaticParams,
  MarketplaceDetailScreen,
  type MarketplaceDetailScreenProps,
} from "@/features/marketplace/components/marketplace-detail-screen"
import {
  buildPrivateMetadata,
  buildPublicMetadata,
  summarizeDescription,
} from "@/lib/discovery/metadata"
import { getMarketplaceCatalogItem } from "@/lib/catalog/server"

export const dynamic = "force-dynamic"

export const generateStaticParams = generateMarketplaceStaticParams

export async function generateMetadata({
  params,
}: MarketplaceDetailScreenProps) {
  const { slug } = await params
  const item = await getMarketplaceCatalogItem(slug)

  if (!item) return buildPrivateMetadata("Marketplace Entry Not Found")

  const kind = item.kind === "tool" ? "WebAssembly Tool" : "IronClaw Skill"
  const description =
    summarizeDescription(item.description || item.body) ||
    `Explore ${item.name}, a public ${kind.toLowerCase()} on IronHub.`
  const path = `/marketplace/${item.slug}`

  return buildPublicMetadata({
    title: `${item.name} — ${kind}`,
    description,
    path,
    markdownPath: `${path}.md`,
    imagePath: `${path}/opengraph-image`,
    imageAlt: `${item.name} ${kind} on IronHub`,
  })
}

export default function MarketplaceDetailPage(
  props: MarketplaceDetailScreenProps
) {
  return <MarketplaceDetailScreen {...props} />
}
