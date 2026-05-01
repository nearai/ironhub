import Image from "next/image"

import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogBrowser } from "@/components/ironhub/catalog-browser"
import { CatalogCard } from "@/components/ironhub/catalog-card"
import { HomeMobileToolbar } from "@/components/ironhub/home-mobile-toolbar"
import { HomeSidebar } from "@/components/ironhub/home-sidebar"
import { IronClawHero } from "@/components/ironhub/ironclaw-hero"
import { SectionHeading } from "@/components/ironhub/section-heading"
import {
  getCatalogStats,
  getCategories,
  getMarketplaceCatalog,
} from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

type HomePageProps = {
  searchParams: Promise<{ category?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const { category: categoryParam } = await searchParams
  const { items } = await getMarketplaceCatalog()
  const stats = getCatalogStats(items)

  const categoryCounts = getCategories(items).map((cat) => ({
    slug: cat,
    count: items.filter((it) => it.category === cat).length,
  }))

  const featuredItems = (
    categoryParam
      ? items.filter((it) => it.category === categoryParam)
      : items
  ).slice(0, 6)

  return (
    <main className="relative min-h-screen">
      <IronClawHero
        total={stats.total}
        skills={stats.skills}
        tools={stats.tools}
      />

      <HomeMobileToolbar
        categories={categoryCounts}
        totalCount={items.length}
      />

      <div className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-[4.5rem]">
              <HomeSidebar
                categories={categoryCounts}
                totalCount={items.length}
              />
            </div>
          </aside>

          <div className="min-w-0 grid gap-12">
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
                title="Search and filter the hub"
                description="The home grid mirrors the old IronHub browsing flow while using the current Next marketplace data."
              />
              <CatalogBrowser items={items} categories={getCategories(items)} />
            </section>
          </div>
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
