import type { ViewMode } from "@/features/catalog/hooks/use-catalog-browser"
import type { CatalogKind } from "@/lib/catalog/types"
import type { SortMode } from "@/lib/catalog/utils"

export type CatalogFilterKind = CatalogKind | "all"

export type CatalogFiltersProps = {
  query: string
  onQueryChange: (value: string) => void
  kind: CatalogFilterKind
  onKindChange: (value: CatalogFilterKind) => void
  category: string
  onCategoryChange: (value: string) => void
  sort: SortMode
  onSortChange: (value: SortMode) => void
  view: ViewMode
  onViewChange: (value: ViewMode) => void
  categories: string[]
  compact?: boolean
}
