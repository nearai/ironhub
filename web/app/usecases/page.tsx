import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"
import { ShowcaseBrowser } from "@/features/showcase/components/showcase-browser"
import { queryUseCases, getUsecaseCategories, getUseCasesCached } from "@/lib/usecases/server"

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
      <div className="mx-auto grid w-full max-w-7xl gap-6 min-w-0">
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

