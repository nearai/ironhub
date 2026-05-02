"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { CatalogItem, CatalogKind } from "@/lib/catalog-types"
import { filterCatalog, sortCatalog, filterCollections, sortCollections, type SortMode } from "@/lib/catalog-utils"
import type { CollectionBundle } from "@/lib/collection-bundles"

export type ViewMode = "grid" | "list"

export function useCatalogBrowser(items: CatalogItem[], collections: CollectionBundle[]) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const kindParam = searchParams.get("kind")
  const queryParam = searchParams.get("q") ?? ""
  const [queryState, setQueryState] = useState({
    param: queryParam,
    value: queryParam,
  })
  const kind = getKindFromParam(kindParam)
  const category = getCategoryFromParam(items, categoryParam)
  const [sort, setSort] = useState<SortMode>("relevance")
  const [view, setView] = useState<ViewMode>("grid")
  const query =
    queryState.param === queryParam ? queryState.value : queryParam

  function setQuery(nextQuery: string) {
    setQueryState({ param: queryParam, value: nextQuery })
    setFilterParam("q", nextQuery)
  }

  function setKind(nextKind: CatalogKind | "all") {
    setFilterParam("kind", nextKind)
  }

  function setCategory(nextCategory: string) {
    setFilterParam("category", nextCategory)
  }

  function setFilterParam(key: "category" | "kind" | "q", value: string) {
    const params = new URLSearchParams(searchParams)

    if (value === "all" || (key === "q" && !value)) {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }

  const results = useMemo(() => {
    return sortCatalog(filterCatalog(items, query, kind === "collection" ? "all" : kind, category), sort)
  }, [items, query, kind, category, sort])

  const filteredCollections = useMemo(() => {
    return sortCollections(filterCollections(collections, query))
  }, [collections, query])

  return {
    query,
    setQuery,
    kind,
    setKind,
    category,
    setCategory,
    sort,
    setSort,
    view,
    setView,
    results,
    filteredCollections,
  }
}

function getKindFromParam(kindParam: string | null): CatalogKind | "all" {
  if (kindParam === "tool" || kindParam === "skill" || kindParam === "collection") {
    return kindParam
  }

  return "all"
}

function getCategoryFromParam(
  items: CatalogItem[],
  categoryParam: string | null
) {
  if (!categoryParam) {
    return "all"
  }

  return items.some((item) => item.category === categoryParam)
    ? categoryParam
    : "all"
}
