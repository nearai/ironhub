import { Suspense } from "react"
import { LoadoutBuilder } from "@/components/ironhub/agents/loadout-builder"
import { getMarketplaceCatalog } from "@/lib/catalog.server"
import { buildCollectionBundles } from "@/lib/collection-bundles"
import { IconLoader2 } from "@tabler/icons-react"
import { HubLayout } from "@/components/ironhub/hub-layout"

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
    <HubLayout fluid>
      <div className="flex min-h-[calc(100vh-65px)] w-full items-start">
        <Suspense
          fallback={
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 py-20">
              <IconLoader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
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
