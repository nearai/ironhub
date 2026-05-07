import { notFound } from "next/navigation"

import { HubLayout } from "@/components/ironhub/hub-layout"
import { MarketDetailAside } from "@/components/ironhub/market-detail-aside"
import { MarketDetailHeader } from "@/components/ironhub/market-detail-header"
import { MarketDetailInfo } from "@/components/ironhub/market-detail-info"
import { MarketDetailSurface } from "@/components/ironhub/market-detail-surface"
import { getCatalog, getMarketplaceCatalogItem } from "@/lib/catalog.server"

type MarketplaceDetailPageProps = {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export async function generateStaticParams() {
  const items = await getCatalog()
  return items.map((item) => ({ slug: item.slug }))
}

export default async function MarketplaceDetailPage({
  params,
}: MarketplaceDetailPageProps) {
  const { slug } = await params
  const item = await getMarketplaceCatalogItem(slug)

  if (!item) {
    notFound()
  }

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl w-full min-w-0 gap-6">
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
