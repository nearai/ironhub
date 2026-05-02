import { notFound } from "next/navigation"

import { CollectionEntryList } from "@/components/ironhub/collection-entry-list"
import { CollectionGrabCard } from "@/components/ironhub/collection-grab-card"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { PageHeader } from "@/components/ironhub/page-header"
import { Button } from "@/components/ui/button"
import {
  collectionBundleDefinitions,
  getCollectionBundle,
} from "@/lib/collection-bundles"
import { getMarketplaceCatalog } from "@/lib/catalog.server"

type CollectionDetailPageProps = {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return collectionBundleDefinitions.map((collection) => ({
    slug: collection.slug,
  }))
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const { slug } = await params
  const { items } = await getMarketplaceCatalog()
  const collection = getCollectionBundle(items, slug)

  if (!collection) {
    notFound()
  }

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-6">
        <PageHeader
          eyebrow="Collection"
          title={collection.title}
          description={collection.outcome}
        >
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="#bundle-manifest">Grab Collection</a>
            </Button>
            <Button asChild variant="outline">
              <a href="#included-entries">
                {collection.items.length} Included Entries
              </a>
            </Button>
          </div>
        </PageHeader>
        <CollectionGrabCard bundle={collection} />
        <section id="included-entries" className="grid gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">
              Included Tools and Skills
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This collection keeps the workflow together on one page. Use the
              bundle action above when you want all entries together.
            </p>
          </div>
          <CollectionEntryList items={collection.items} />
        </section>
      </div>
    </HubLayout>
  )
}
