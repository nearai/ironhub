import { CollectionBundleCard } from "@/components/ironhub/collection-bundle-card"
import type { CollectionBundle } from "@/lib/collection-bundles"

type CollectionStartsProps = {
  collections: CollectionBundle[]
}

export function CollectionStarts({ collections }: CollectionStartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {collections.map((collection) => (
        <CollectionBundleCard
          key={collection.slug}
          bundle={collection}
          compact
        />
      ))}
    </div>
  )
}
