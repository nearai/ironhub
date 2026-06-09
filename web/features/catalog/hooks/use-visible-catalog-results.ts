"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CollectionBundle } from "@/lib/catalog/collections"
import type { CatalogItem, CatalogKind } from "@/lib/catalog/types"

export type CatalogResult = CatalogItem | CollectionBundle

type UseVisibleCatalogResultsInput = {
  kind: CatalogKind | "all"
  category: string
  results: CatalogItem[]
  filteredCollections: CollectionBundle[]
}

export function useVisibleCatalogResults({
  kind,
  category,
  results,
  filteredCollections,
}: UseVisibleCatalogResultsInput) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [pagination, setPagination] = useState({
    resultKey: "",
    visibleCount: 24,
  })

  const combinedResults = useMemo(() => {
    if (kind === "collection") return filteredCollections
    if (kind !== "all") return results

    const mixed: CatalogResult[] = []
    let collectionIndex = 0

    results.forEach((item, index) => {
      mixed.push(item)
      if (
        (index + 1) % 3 === 0 &&
        collectionIndex < filteredCollections.length
      ) {
        mixed.push(filteredCollections[collectionIndex])
        collectionIndex += 1
      }
    })

    while (collectionIndex < filteredCollections.length) {
      mixed.push(filteredCollections[collectionIndex])
      collectionIndex += 1
    }

    return mixed
  }, [kind, results, filteredCollections])

  const resultKey = useMemo(
    () => combinedResults.map((result) => result.slug).join("|"),
    [combinedResults]
  )
  const visibleCount =
    pagination.resultKey === resultKey ? pagination.visibleCount : 24

  useEffect(() => {
    window.scrollTo({ top: 280, behavior: "smooth" })
  }, [category, kind])

  useEffect(() => {
    if (visibleCount >= combinedResults.length) return
    const trigger = loadMoreRef.current
    if (!trigger) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setPagination((current) => ({
          resultKey,
          visibleCount: Math.min(
            (current.resultKey === resultKey ? current.visibleCount : 24) + 24,
            combinedResults.length
          ),
        }))
      },
      { threshold: 0.1, rootMargin: "400px" }
    )

    observer.observe(trigger)
    return () => observer.unobserve(trigger)
  }, [visibleCount, combinedResults.length, resultKey])

  return {
    combinedResults,
    visibleResults: combinedResults.slice(0, visibleCount),
    hasMore: visibleCount < combinedResults.length,
    loadMoreRef,
  }
}
