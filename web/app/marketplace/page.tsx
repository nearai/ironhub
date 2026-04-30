import { Suspense } from "react"

import { CatalogBrowser } from "@/components/ironhub/catalog-browser"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { MetricGrid } from "@/components/ironhub/metric-grid"
import { PageHeader } from "@/components/ironhub/page-header"
import {
  getCatalog,
  getCatalogStats,
  getCategories,
} from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const items = await getCatalog()
  const stats = getCatalogStats(items)

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-6">
        <PageHeader
          eyebrow="Marketplace"
          title="IronClaw skills and tool trunks"
          description="Search SKILL.md branches and WASM tools parsed from this repo, with source, setup, auth, and limits kept visible."
        >
          <MetricGrid
            metrics={[
              { label: "Total entries", value: stats.total },
              { label: "WASM tools", value: stats.tools },
              { label: "Prompt skills", value: stats.skills },
              { label: "Exposed actions", value: stats.actions },
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
