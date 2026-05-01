import { Suspense } from "react"

import { CatalogBrowser } from "@/components/ironhub/catalog-browser"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { MetricGrid } from "@/components/ironhub/metric-grid"
import { PageHeader } from "@/components/ironhub/page-header"
import {
  getCatalogStats,
  getCategories,
  getMarketplaceCatalog,
} from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const { items } = await getMarketplaceCatalog()
  const stats = getCatalogStats(items)

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
        <Suspense fallback={null}>
          <CatalogBrowser items={items} categories={getCategories(items)} />
        </Suspense>
      </div>
    </HubLayout>
  )
}
