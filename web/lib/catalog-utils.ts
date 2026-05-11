import type { CatalogItem, CatalogKind } from "@/lib/catalog-types"
import type { CollectionBundle } from "@/lib/collection-bundles"

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

export function filterCollections(
  collections: CollectionBundle[],
  query: string,
  category?: string
) {
  const needle = query.trim().toLowerCase()

  return collections.filter((bundle) => {
    if (category && category !== "all") {
      const hasMatchingCategory = bundle.items.some(
        (item) => item.category === category
      )
      if (!hasMatchingCategory) return false
    }

    const haystack = [
      bundle.title,
      bundle.slug,
      bundle.summary,
      bundle.outcome,
      ...bundle.keywords,
    ]
      .join(" ")
      .toLowerCase()

    return !needle || haystack.includes(needle)
  })
}

export function sortCollections(collections: CollectionBundle[]) {
  return [...collections].sort((a, b) => {
    return scoreCollectionBundle(b) - scoreCollectionBundle(a)
  })
}

function scoreCollectionBundle(bundle: CollectionBundle) {
  return bundle.items.length + bundle.keywords.length
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
