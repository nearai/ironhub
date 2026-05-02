import { Suspense } from "react"
import { CatalogBrowser } from "@/components/ironhub/catalog-browser"
import { HomeMobileToolbar } from "@/components/ironhub/home-mobile-toolbar"
import { HomeSidebar } from "@/components/ironhub/home-sidebar"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { IronClawHero } from "@/components/ironhub/ironclaw-hero"
import { MarketplaceSourceNote } from "@/components/ironhub/marketplace-source-note"
import {
  getCatalogStats,
  getCategories,
  getMarketplaceCatalog,
} from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function Home() {
  const { items, iliad } = await getMarketplaceCatalog()
  const stats = getCatalogStats(items)
  const categories = getCategories(items)

  return (
    <HubLayout>
      <div className="ih-fade-up">
        <IronClawHero
          total={stats.total}
          skills={stats.skills}
          tools={stats.tools}
        />
      </div>

      <HomeMobileToolbar
        categories={categories.map((c) => ({
          slug: c,
          count: items.filter((i) => i.category === c).length,
        }))}
        totalCount={stats.total}
      />

      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[5.5rem]">
            <HomeSidebar
              categories={categories.map((c) => ({
                slug: c,
                count: items.filter((i) => i.category === c).length,
              }))}
              totalCount={stats.total}
            />
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          <MarketplaceSourceNote {...iliad} />
          <Suspense fallback={null}>
            <CatalogBrowser items={items} categories={categories} />
          </Suspense>
        </div>
      </div>
    </HubLayout>
  )
}
