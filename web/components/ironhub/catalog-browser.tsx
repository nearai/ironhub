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

  const [visibleCount, setVisibleCount] = useState(24)
  const [prevCombinedResults, setPrevCombinedResults] = useState(combinedResults)

  // Reset visible count during render when results change to avoid cascading renders
  if (combinedResults !== prevCombinedResults) {
    setPrevCombinedResults(combinedResults)
    setVisibleCount(24)
  }

  // Scroll to top when switching categories or kinds
  useEffect(() => {
    window.scrollTo({ top: 280, behavior: "smooth" })
  }, [browser.category, browser.kind])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (visibleCount >= combinedResults.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 24, combinedResults.length))
        }
      },
      { threshold: 0.1, rootMargin: "400px" }
    )

    const trigger = document.getElementById("catalog-load-more-trigger")
    if (trigger) observer.observe(trigger)

    return () => {
      if (trigger) observer.unobserve(trigger)
    }
  }, [visibleCount, combinedResults.length])

  const visibleResults = useMemo(() => {
    return combinedResults.slice(0, visibleCount)
  }, [combinedResults, visibleCount])

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
        {visibleResults.map((result: CatalogItem | CollectionBundle) => {
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
      
      {visibleCount < combinedResults.length && (
        <div 
          id="catalog-load-more-trigger" 
          className="h-10 w-full flex items-center justify-center opacity-50"
        >
          <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1" />
          <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1 delay-75" />
          <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1 delay-150" />
        </div>
      )}

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
