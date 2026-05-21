"use client"

import { cn } from "@/lib/shared/utils"
import { CatalogFilterSelects } from "./catalog-filter-selects"
import type { CatalogFiltersProps } from "./catalog-filter-types"
import { CatalogKindTabs } from "./catalog-kind-tabs"
import { CatalogSearchField } from "./catalog-search-field"
import { CatalogViewToggle } from "./catalog-view-toggle"

export function CatalogFilters(props: CatalogFiltersProps) {
  const compact = props.compact

  return (
    <div
      className={cn(
        "grid gap-3 transition-all duration-300",
        compact && "lg:gap-1.5"
      )}
    >
      <CatalogSearchField
        value={props.query}
        compact={compact}
        onChange={props.onQueryChange}
      />

      <div
        className={cn(
          "scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 transition-all duration-300 lg:flex-wrap lg:overflow-visible lg:pb-0",
          compact && "lg:pb-0"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 transition-all duration-300",
            compact && "lg:gap-3"
          )}
        >
          <CatalogKindTabs
            value={props.kind}
            compact={compact}
            onChange={props.onKindChange}
          />
          <CatalogFilterSelects
            category={props.category}
            categories={props.categories}
            sort={props.sort}
            compact={compact}
            onCategoryChange={props.onCategoryChange}
            onSortChange={props.onSortChange}
          />
        </div>

        <CatalogViewToggle
          value={props.view}
          compact={compact}
          onChange={props.onViewChange}
        />
      </div>
    </div>
  )
}
