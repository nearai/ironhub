import { ActionLink } from "@/features/shell/components/action-link"
import { CatalogCard } from "@/features/catalog/components/catalog-card"
import { CollectionStarts } from "@/features/catalog/components/collection-starts"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { IronClawHero } from "@/features/home/components/ironclaw-hero"
import { SectionHeading } from "@/features/shell/components/section-heading"
import { buildCollectionBundles } from "@/lib/catalog/collections"
import { getCatalogStats, getMarketplaceCatalog } from "@/lib/catalog/server"

export async function HomeScreen() {
  const { items } = await getMarketplaceCatalog()
  const stats = getCatalogStats(items)
  const featuredItems = items.slice(0, 6)
  const collections = buildCollectionBundles(items).slice(0, 3)

  return (
    <HubLayout>
      <div className="ih-fade-up">
        <IronClawHero
          total={stats.total}
          skills={stats.skills}
          tools={stats.tools}
        />
      </div>

      <div className="px-4 pb-16 sm:px-6 lg:px-4">
        <div className="mx-auto grid max-w-7xl gap-12">
          <section className="ih-fade-up" style={{ animationDelay: "0.1s" }}>
            <SectionHeading
              title="Staff Picks"
              description="Curated signal from the current catalog for quick trust."
              action={
                <ActionLink href="/marketplace">View all entries</ActionLink>
              }
            />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredItems.map((item) => (
                <CatalogCard key={item.slug} item={item} />
              ))}
            </div>
          </section>

          <section className="ih-fade-up" style={{ animationDelay: "0.2s" }}>
            <SectionHeading
              title="Tool Collections"
              description="Unified bundles of 10-20 related tools and skills for common IronClaw jobs."
            />
            <CollectionStarts collections={collections} />
          </section>
        </div>
      </div>
    </HubLayout>
  )
}
