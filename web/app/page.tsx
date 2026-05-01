import Image from "next/image"

import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogCard } from "@/components/ironhub/catalog-card"
import { CollectionStarts } from "@/components/ironhub/collection-starts"
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
    <main className="relative min-h-screen">
      <IronClawHero
        total={stats.total}
        skills={stats.skills}
        tools={stats.tools}
      />

      <div className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12">
          <section>
            <SectionHeading
              title="Staff Picks"
              description="Curated signal from the current catalog for quick trust."
              action={
                <ActionLink href="/marketplace">View all entries</ActionLink>
              }
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredItems.map((item) => (
                <CatalogCard key={item.slug} item={item} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeading
              title="Tool Collections"
              description="Unified bundles of 10-20 related tools and skills for common IronClaw jobs."
            />
            <CollectionStarts collections={collections} />
          </section>
        </div>
      </div>

      <Image
        src="/ironclaw.png"
        alt=""
        aria-hidden="true"
        width={420}
        height={420}
        className="pointer-events-none fixed right-0 bottom-0 z-[-1] h-auto w-[260px] opacity-70 select-none sm:w-[340px] lg:w-[420px]"
        style={{ filter: "drop-shadow(0 4px 24px rgba(43, 130, 212, 0.25))" }}
      />
    </main>
  )
}
