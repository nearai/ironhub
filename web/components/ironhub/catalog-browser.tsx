"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useCatalogBrowser } from "@/hooks/use-catalog-browser"
import type { CatalogItem } from "@/lib/catalog-types"
import { cn } from "@/lib/utils"
import { CatalogCard } from "./catalog-card"
import { CatalogFilters } from "./catalog-filters"

type CatalogBrowserProps = {
  items: CatalogItem[]
  categories: string[]
}

export function CatalogBrowser({ items, categories }: CatalogBrowserProps) {
  const browser = useCatalogBrowser(items)

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent>
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
          />
        </CardContent>
      </Card>
      <div className={cn("grid gap-4", browser.view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
        {browser.results.map((item) => (
          <CatalogCard key={item.slug} item={item} compact={browser.view === "list"} />
        ))}
      </div>
      {!browser.results.length && (
        <Card>
          <CardContent className="text-muted-foreground text-center text-sm">
            No matching repo entries. Create a new skill proposal to add the next branch.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
