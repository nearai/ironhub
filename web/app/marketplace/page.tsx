import { Suspense } from "react"

import { CatalogBrowser } from "@/components/ironhub/catalog-browser"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { MarketplaceSourceNote } from "@/components/ironhub/marketplace-source-note"
import { MetricGrid } from "@/components/ironhub/metric-grid"
import { PageHeader } from "@/components/ironhub/page-header"
import {
  getCatalogStats,
  getCategories,
  getMarketplaceCatalog,
} from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const { items, iliad } = await getMarketplaceCatalog()
  const stats = getCatalogStats(items)

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-6">
        <PageHeader
          eyebrow="Marketplace"
          title="IronClaw skills and tool trunks"
          description="Search repo-backed SKILL.md branches, WASM tools, and public prompt skills mirrored from Iliad."
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
        <MarketplaceSourceNote {...iliad} />
        <Suspense fallback={null}>
          <CatalogBrowser items={items} categories={getCategories(items)} />
        </Suspense>
      </div>
    </HubLayout>
  )
}
