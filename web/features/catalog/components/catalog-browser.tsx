"use client"

import { useEffect, useState } from "react"
import { useCatalogBrowser } from "@/features/catalog/hooks/use-catalog-browser"
import { useVisibleCatalogResults } from "@/features/catalog/hooks/use-visible-catalog-results"
import type { CollectionBundle } from "@/lib/catalog/collections"
import type { CatalogItem } from "@/lib/catalog/types"
import { cn } from "@/lib/shared/utils"
import { CatalogFilters } from "./catalog-filters"
import { CatalogResultsGrid } from "./catalog-results-grid"

type CatalogBrowserProps = {
  items: CatalogItem[]
  collections: CollectionBundle[]
  categories: string[]
  children?: React.ReactNode
}

export function CatalogBrowser({
  items,
  collections,
  categories,
  children,
}: CatalogBrowserProps) {
  const browser = useCatalogBrowser(items, collections)
  const [isScrolled, setIsScrolled] = useState(false)
  const visible = useVisibleCatalogResults({
    kind: browser.kind,
    category: browser.category,
    results: browser.results,
    filteredCollections: browser.filteredCollections,
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 160)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          "sticky top-16 z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-md transition-all duration-300",
          "lg:sticky lg:top-[4.5rem] lg:mx-0 lg:rounded-xl lg:border",
          isScrolled
            ? "lg:border-primary/20 lg:bg-background/90 lg:p-3 lg:shadow-md lg:backdrop-blur-md"
            : "lg:border-[var(--ironhub-line)] lg:bg-card lg:p-6 lg:shadow-sm lg:backdrop-blur-none"
        )}
      >
        <CatalogFilters
          query={browser.query}
          onQueryChange={browser.setQuery}
          kind={browser.kind}
          onKindChange={browser.setKind}
          category={browser.category}
          onCategoryChange={browser.setCategory}
          sort={browser.sort}
          onSortChange={browser.setSort}
          view={browser.view}
          onViewChange={browser.setView}
          categories={categories}
          compact={isScrolled}
        />
      </div>

      {children}

      <CatalogResultsGrid
        results={visible.visibleResults}
        totalResults={visible.combinedResults.length}
        collectionsCount={collections.length}
        kind={browser.kind}
        view={browser.view}
        hasMore={visible.hasMore}
        loadMoreRef={visible.loadMoreRef}
      />
    </div>
  )
}
