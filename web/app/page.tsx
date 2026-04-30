import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogCard } from "@/components/ironhub/catalog-card"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { MetricGrid } from "@/components/ironhub/metric-grid"
import { PageHero } from "@/components/ironhub/page-hero"
import { SectionHeading } from "@/components/ironhub/section-heading"
import { getCatalog, getCatalogStats } from "@/lib/catalog.server"
import { links } from "@/lib/links"

export const dynamic = "force-dynamic"

export default async function Home() {
  const items = await getCatalog()
  const stats = getCatalogStats(items)

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHero
          eyebrow="IronHub"
          title="The repo-backed home for IronClaw skills and tools"
          description="Discover integrations directly parsed from this repository: tracking rows, tool manifests, Rust action enums, and SKILL.md frontmatter."
        >
          <div className="grid gap-6">
            <MetricGrid
              metrics={[
                { label: "Live tools", value: stats.tools },
                { label: "Live skills", value: stats.skills },
                { label: "Tool actions", value: stats.actions },
                { label: "Categories", value: stats.categories },
              ]}
            />
            <div className="flex flex-wrap gap-3">
              <ActionLink href="/marketplace" variant="default">
                Browse marketplace
              </ActionLink>
              <ActionLink href={links.newSkill} external>
                Create Skill
              </ActionLink>
            </div>
          </div>
        </PageHero>
        <section>
          <SectionHeading
            title="Current repo inventory"
            description="Cards are generated from filesystem data at server render time, not hard-coded catalog rows."
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
