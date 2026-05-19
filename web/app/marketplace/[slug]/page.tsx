import {
  generateMarketplaceStaticParams,
  MarketplaceDetailScreen,
  type MarketplaceDetailScreenProps,
} from "@/features/marketplace/components/marketplace-detail-screen"

export const dynamic = "force-dynamic"

export const generateStaticParams = generateMarketplaceStaticParams

export default function MarketplaceDetailPage(
  props: MarketplaceDetailScreenProps
) {
  return <MarketplaceDetailScreen {...props} />
}
