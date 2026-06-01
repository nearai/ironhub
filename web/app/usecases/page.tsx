import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"
import { ShowcaseBrowser } from "@/features/showcase/components/showcase-browser"
import { getUseCases, getUsecaseCategories } from "@/lib/usecases/server"

export default async function UseCasesPage() {
  const useCases = await getUseCases()
  const categories = await getUsecaseCategories()

  return (
    <HubLayout>
      <div className="mx-auto grid w-full max-w-7xl gap-6 min-w-0">
        <PageHeader
          eyebrow="Use Cases"
          title="What can you build with IronClaw?"
          description="Explore real-world workflows, automations, and agents built by the community."
        />
        <ShowcaseBrowser useCases={useCases} categories={categories} />
      </div>
    </HubLayout>
  )
}
