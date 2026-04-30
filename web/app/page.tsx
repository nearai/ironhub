import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogCard } from "@/components/ironhub/catalog-card"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { IronClawHero } from "@/components/ironhub/ironclaw-hero"
import { SectionHeading } from "@/components/ironhub/section-heading"
import { getCatalog } from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function Home() {
  const items = await getCatalog()

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-10">
        <IronClawHero />

        <section className="grid gap-6">
          <SectionHeading
            title="Current repo-backed entries"
            description="Cards are generated from filesystem data at server render time, so the marketplace follows the repo instead of a hard-coded CMS."
            action={
              <ActionLink href="/developer">Contributor portal</ActionLink>
            }
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <CatalogCard key={item.slug} item={item} />
            ))}
          </div>
        </section>
      </div>
    </HubLayout>
  )
}
