import { notFound } from "next/navigation"

import { CollectionEntryList } from "@/features/catalog/components/collection-entry-list"
import { CollectionGrabCard } from "@/features/catalog/components/collection-grab-card"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"
import { Button } from "@/components/ui/button"
import {
  collectionBundleDefinitions,
  getCollectionBundle,
} from "@/lib/catalog/collections"
import { getMarketplaceCatalog } from "@/lib/catalog/server"

export type CollectionDetailScreenProps = {
  params: Promise<{ slug: string }>
}

export function generateCollectionStaticParams() {
  return collectionBundleDefinitions.map((collection) => ({
    slug: collection.slug,
  }))
}

export async function CollectionDetailScreen({
  params,
}: CollectionDetailScreenProps) {
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
