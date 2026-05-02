import { Suspense } from "react"

import { CatalogBrowser } from "@/components/ironhub/catalog-browser"
import { MarketplaceMobileToolbar } from "@/components/ironhub/marketplace-mobile-toolbar"
import { MarketplaceSidebar } from "@/components/ironhub/marketplace-sidebar"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { MarketplaceSourceNote } from "@/components/ironhub/marketplace-source-note"
import { MetricGrid } from "@/components/ironhub/metric-grid"
import { PageHeader } from "@/components/ironhub/page-header"
import {
  getCatalogStats,
  getCategories,
  getMarketplaceCatalog,
} from "@/lib/catalog.server"
import { buildCollectionBundles } from "@/lib/collection-bundles"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const { items, iliad } = await getMarketplaceCatalog()
  const stats = getCatalogStats(items)
  const categories = getCategories(items)
  const collections = buildCollectionBundles(items)

  const categoryCounts = categories.map((c) => ({
    slug: c,
    count: items.filter((i) => i.category === c).length,
  }))

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-6">
        <PageHeader
          eyebrow="IronClaw Marketplace"
          title="Browse IronClaw Skills and Tools"
          description="Search repo-backed skills, WASM tools, and public Iliad skills from one catalog."
        >
          <MetricGrid
            metrics={[
              { label: "Total entries", value: stats.total },
              { label: "WASM tools", value: stats.tools },
              { label: "Prompt skills", value: stats.skills },
              { label: "Iliad skills", value: stats.iliad },
            ]}
          />
        </PageHeader>

        <MarketplaceMobileToolbar
          categories={categoryCounts}
          totalCount={stats.total}
        />

        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[5.5rem]">
              <MarketplaceSidebar
                categories={categoryCounts}
                totalCount={stats.total}
              />
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            <MarketplaceSourceNote {...iliad} />
            <Suspense fallback={null}>
              <CatalogBrowser
                items={items}
                collections={collections}
                categories={categories}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </HubLayout>
  )
}
