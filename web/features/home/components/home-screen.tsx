import Link from "next/link"

import { CatalogCard } from "@/features/catalog/components/catalog-card"
import { CollectionStarts } from "@/features/catalog/components/collection-starts"
import { HomeMarquee } from "@/features/home/components/home-marquee"
import { HomeTrustBand } from "@/features/home/components/home-trust-band"
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

      <HomeMarquee
        total={stats.total}
        skills={stats.skills}
        tools={stats.tools}
      />

      <div className="grid gap-16 py-16">
        <section className="ih-fade-up" style={{ animationDelay: "0.1s" }}>
          <SectionHeading
            title="Staff Picks"
            description="Curated signal from the current catalog for quick trust."
            action={
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 border-b border-primary pb-1 font-mono text-[0.8rem] tracking-[0.1em] whitespace-nowrap text-primary uppercase transition-colors hover:text-primary/80"
              >
                View all entries +
              </Link>
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

      <HomeTrustBand />
    </HubLayout>
  )
}
