import { Suspense } from "react"

import { CatalogBrowser } from "@/features/catalog/components/catalog-browser"
import { MarketplaceMobileToolbar } from "@/features/marketplace/components/marketplace-mobile-toolbar"
import { MarketplaceSidebar } from "@/features/marketplace/components/marketplace-sidebar"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { MetricGrid } from "@/features/home/components/metric-grid"
import { PageHeader } from "@/features/shell/components/page-header"
import {
  getCatalogStats,
  getCategories,
  getMarketplaceCatalog,
} from "@/lib/catalog/server"
import { buildCollectionBundles } from "@/lib/catalog/collections"

export async function MarketplaceScreen() {
  const { items } = await getMarketplaceCatalog()
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
          eyebrow="Skill Library"
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
