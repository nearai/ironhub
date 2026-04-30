import type { CatalogItem, CatalogKind } from "@/lib/catalog-types"

export type SortMode = "relevance" | "name" | "actions"

export function filterCatalog(
  items: CatalogItem[],
  query: string,
  kind: CatalogKind | "all",
  category: string
) {
  const needle = query.trim().toLowerCase()

  return items.filter((item) => {
    const matchesKind = kind === "all" || item.kind === kind
    const matchesCategory = category === "all" || item.category === category
    const haystack = [
      item.name,
      item.slug,
      item.description,
      item.category,
      ...item.tags,
      ...item.limits,
    ]
      .join(" ")
      .toLowerCase()

    return matchesKind && matchesCategory && (!needle || haystack.includes(needle))
  })
}

export function sortCatalog(items: CatalogItem[], sort: SortMode) {
  return [...items].sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name)
    }

    if (sort === "actions") {
      return (b.metrics.actions ?? 0) - (a.metrics.actions ?? 0)
    }

    return scoreCatalogItem(b) - scoreCatalogItem(a)
  })
}

function scoreCatalogItem(item: CatalogItem) {
  return (item.metrics.actions ?? 0) + (item.metrics.keywords ?? 0) + item.tags.length
}
