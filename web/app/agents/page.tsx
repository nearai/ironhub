import { Suspense } from "react"
import { LoadoutBuilder } from "@/components/ironhub/agents/loadout-builder"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { getMarketplaceCatalog } from "@/lib/catalog.server"
import { buildCollectionBundles } from "@/lib/collection-bundles"
import { IconLoader2 } from "@tabler/icons-react"

export const dynamic = "force-dynamic"

export default async function AgentsPage() {
  const { items } = await getMarketplaceCatalog()
  const collections = buildCollectionBundles(items)
  const catalog = {
    skills: items.filter((item) => item.kind === "skill"),
    tools: items.filter((item) => item.kind === "tool"),
    collections,
  }

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <IconLoader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                Loading Agent Loadout Builder...
              </p>
            </div>
          }
        >
          <LoadoutBuilder catalog={catalog} />
        </Suspense>
      </div>
    </HubLayout>
  )
}

