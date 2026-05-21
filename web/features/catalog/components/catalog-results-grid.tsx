"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { CollectionBundle } from "@/lib/catalog/collections"
import type { CatalogKind } from "@/lib/catalog/types"
import { cn } from "@/lib/shared/utils"
import { CatalogCard } from "./catalog-card"
import { CollectionBundleCard } from "./collection-bundle-card"
import type { CatalogResult } from "../hooks/use-visible-catalog-results"

type CatalogResultsGridProps = {
  results: CatalogResult[]
  totalResults: number
  collectionsCount: number
  kind: CatalogKind | "all"
  view: "grid" | "list"
  hasMore: boolean
  loadMoreRef: React.RefObject<HTMLDivElement | null>
}

function isCollectionBundle(result: CatalogResult): result is CollectionBundle {
  return "kind" in result && result.kind === "collection"
}

export function CatalogResultsGrid({
  results,
  totalResults,
  collectionsCount,
  kind,
  view,
  hasMore,
  loadMoreRef,
}: CatalogResultsGridProps) {
  if (!totalResults) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {kind === "collection" && !collectionsCount
            ? "No collections found."
            : "No matching entries found. Try adjusting your filters."}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-4",
          view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        )}
      >
        {results.map((result) =>
          isCollectionBundle(result) ? (
            <CollectionBundleCard
              key={result.slug}
              bundle={result}
              compact={view === "list"}
            />
          ) : (
            <CatalogCard
              key={result.slug}
              item={result}
              compact={view === "list"}
            />
          )
        )}
      </div>

      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex h-10 w-full items-center justify-center opacity-50"
        >
          <div className="mx-1 h-2 w-2 animate-pulse rounded-full bg-primary" />
          <div className="mx-1 h-2 w-2 animate-pulse rounded-full bg-primary delay-75" />
          <div className="mx-1 h-2 w-2 animate-pulse rounded-full bg-primary delay-150" />
        </div>
      )}
    </>
  )
}
