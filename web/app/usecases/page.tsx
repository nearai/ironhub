import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"
import { ShowcaseBrowser } from "@/features/showcase/components/showcase-browser"
import {
  queryUseCases,
  getUsecaseCategories,
  getUseCasesCached,
} from "@/lib/usecases/server"
import { StructuredData } from "@/components/structured-data"
import { buildPublicMetadata } from "@/lib/discovery/metadata"
import { buildUseCasesListingJsonLd } from "@/lib/discovery/json-ld"

export const metadata = buildPublicMetadata({
  title: "IronClaw Use Cases",
  description:
    "Explore community-built IronClaw workflows, automations, and agent configurations.",
  path: "/usecases",
  markdownPath: "/usecases.md",
})

export default async function UseCasesPage() {
  const result = await queryUseCases({ page: 1, limit: 15 })
  const categories = await getUsecaseCategories()

  // Calculate full category counts on the server
  const allUseCases = await getUseCasesCached()
  const categoryCounts: Record<string, number> = {}
  allUseCases.forEach((uc) => {
    uc.categories.forEach((cat) => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
  })

  return (
    <HubLayout>
      <StructuredData
        id="ironhub-usecases-jsonld"
        data={buildUseCasesListingJsonLd(result.useCases)}
      />
      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-6">
        <PageHeader
          eyebrow="Use Cases"
          title="What can you do with IronClaw?"
          description="Explore real-world workflows, automations, and agents built by the community."
        />
        <ShowcaseBrowser
          initialUseCases={result.useCases}
          categories={categories}
          categoryCounts={categoryCounts}
          initialTotal={result.total}
          initialHasMore={result.hasMore}
          totalAllCount={allUseCases.length}
        />
      </div>
    </HubLayout>
  )
}
