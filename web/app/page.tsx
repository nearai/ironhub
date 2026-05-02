import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogCard } from "@/components/ironhub/catalog-card"
import { CollectionStarts } from "@/components/ironhub/collection-starts"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { IronClawHero } from "@/components/ironhub/ironclaw-hero"
import { SectionHeading } from "@/components/ironhub/section-heading"
import { buildCollectionBundles } from "@/lib/collection-bundles"
import { getCatalogStats, getMarketplaceCatalog } from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function Home() {
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

      <div className="px-4 pb-16 sm:px-6 lg:px-0">
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
