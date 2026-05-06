"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useCatalogBrowser } from "@/hooks/use-catalog-browser"
import type { CatalogItem } from "@/lib/catalog-types"
import { cn } from "@/lib/utils"
import { CatalogCard } from "./catalog-card"
import { CollectionBundleCard } from "./collection-bundle-card"
import { CatalogFilters } from "./catalog-filters"
import type { CollectionBundle } from "@/lib/collection-bundles"

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

  useEffect(() => {
    const handleScroll = () => {
      // Transition past 160px of vertical scroll
      setIsScrolled(window.scrollY > 160)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const combinedResults = useMemo(() => {
    if (browser.kind === "collection") {
      return browser.filteredCollections
    }
    if (browser.kind !== "all") {
      return browser.results
    }

    // Mix them: every 3 items, insert a collection
    const mixed: (CatalogItem | CollectionBundle)[] = []
    let collectionIdx = 0
    
    browser.results.forEach((item, i) => {
      mixed.push(item)
      if ((i + 1) % 3 === 0 && collectionIdx < browser.filteredCollections.length) {
        mixed.push(browser.filteredCollections[collectionIdx])
        collectionIdx++
      }
    })

    // Append remaining collections
    while (collectionIdx < browser.filteredCollections.length) {
      mixed.push(browser.filteredCollections[collectionIdx])
      collectionIdx++
    }

    return mixed
  }, [browser.kind, browser.results, browser.filteredCollections])

  return (
    <div className="grid gap-4">
      <div className={cn(
        "sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md transition-all duration-300",
        "lg:sticky lg:top-[4.5rem] lg:mx-0 lg:rounded-xl lg:border",
        isScrolled
          ? "lg:bg-background/90 lg:backdrop-blur-md lg:p-3 lg:shadow-md lg:border-primary/20"
          : "lg:bg-card lg:p-6 lg:shadow-sm lg:border-[var(--ironhub-line)] lg:backdrop-blur-none"
      )}>
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

      <div className={cn("grid gap-4", browser.view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
        {combinedResults.map((result: CatalogItem | CollectionBundle) => {
          if ("kind" in result && result.kind === "collection") {
            return (
              <CollectionBundleCard
                key={result.slug}
                bundle={result}
                compact={browser.view === "list"}
              />
            )
          }
          return (
            <CatalogCard
              key={(result as CatalogItem).slug}
              item={result as CatalogItem}
              compact={browser.view === "list"}
            />
          )
        })}
      </div>
      {!combinedResults.length && (
        <Card>
          <CardContent className="text-muted-foreground text-center text-sm py-10">
            No matching entries found. Try adjusting your filters.
          </CardContent>
        </Card>
      )}
      {browser.kind === "collection" && !collections.length && (
        <Card>
          <CardContent className="text-muted-foreground text-center text-sm py-10">
            No collections found.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
