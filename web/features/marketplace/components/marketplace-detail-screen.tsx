import { notFound } from "next/navigation"

import { HubLayout } from "@/features/shell/components/hub-layout"
import { MarketDetailAside } from "@/features/marketplace/components/market-detail-aside"
import { MarketDetailHeader } from "@/features/marketplace/components/market-detail-header"
import { MarketDetailInfo } from "@/features/marketplace/components/market-detail-info"
import { MarketDetailSurface } from "@/features/marketplace/components/market-detail-surface"
import { getCatalog, getMarketplaceCatalogItem } from "@/lib/catalog/server"

export type MarketplaceDetailScreenProps = {
  params: Promise<{ slug: string }>
}

export async function generateMarketplaceStaticParams() {
  const items = await getCatalog()
  return items.map((item) => ({ slug: item.slug }))
}

export async function MarketplaceDetailScreen({
  params,
}: MarketplaceDetailScreenProps) {
  const { slug } = await params
  const item = await getMarketplaceCatalogItem(slug)

  if (!item) {
    notFound()
  }

  return (
    <HubLayout>
      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-6">
        <MarketDetailHeader item={item} />
        <section className="grid w-full min-w-0 gap-4 lg:grid-cols-[1fr_360px]">
          <MarketDetailInfo item={item} />
          <MarketDetailAside item={item} />
        </section>
        <MarketDetailSurface item={item} />
      </div>
    </HubLayout>
  )
}
