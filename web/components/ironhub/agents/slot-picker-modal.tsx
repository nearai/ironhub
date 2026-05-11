"use client"

import { useMemo, useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CatalogCard } from "@/components/ironhub/catalog-card"
import {
  filterCatalog,
  sortCatalog,
  filterCollections,
  sortCollections,
  type SortMode,
} from "@/lib/catalog-utils"
import type { CatalogItem, CatalogKind } from "@/lib/catalog-types"
import type { CollectionBundle } from "@/lib/collection-bundles"
import {
  IconCategory,
  IconSearch,
  IconSortAscending,
  IconBoxMultiple,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type SlotPickerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: CatalogItem | CollectionBundle) => void
  items: (CatalogItem | CollectionBundle)[]
  filterKind: CatalogKind
  equippedSlugs?: string[]
}

export function SlotPickerModal({
  isOpen,
  onClose,
  onSelect,
  items,
  filterKind,
  equippedSlugs = [],
}: SlotPickerModalProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState<SortMode>("relevance")

  // Filter items based on the context of this slot (e.g. skills, tools, or collections)
  const scopedItems = useMemo(() => {
    if (filterKind === "collection") return items
    return items.filter((item) => item.kind === filterKind)
  }, [items, filterKind])

  // Get unique categories for scoped items (only applicable to skills/tools)
  const categories = useMemo(() => {
    if (filterKind === "collection") return []
    const list = (scopedItems as CatalogItem[]).map((item) => item.category).filter(Boolean)
    return Array.from(new Set(list))
  }, [scopedItems, filterKind])

  // Filter and sort items based on local search, category and sorting state
  const filteredResults = useMemo(() => {
    if (filterKind === "collection") {
      const filtered = filterCollections(scopedItems as CollectionBundle[], query)
      return sortCollections(filtered)
    }
    const filtered = filterCatalog(scopedItems as CatalogItem[], query, "all", category)
    return sortCatalog(filtered, sort)
  }, [scopedItems, query, category, sort, filterKind])

  const [visibleCount, setVisibleCount] = useState(24)
  const [prevFilteredResults, setPrevFilteredResults] = useState(filteredResults)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  // Reset visible count during render to avoid cascading renders
  if (filteredResults !== prevFilteredResults || isOpen !== prevIsOpen) {
    setPrevFilteredResults(filteredResults)
    setPrevIsOpen(isOpen)
    setVisibleCount(24)
  }

  // Scroll the modal container back to top when filters change
  useEffect(() => {
    if (!isOpen) return
    
    setTimeout(() => {
      const container = document.getElementById("slot-picker-scroll-container")
      if (container) {
        container.scrollTo({ top: 0, behavior: "smooth" })
      }
    }, 50)
  }, [filteredResults, isOpen])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!isOpen || visibleCount >= filteredResults.length) return

    // Small delay to ensure Radix Sheet has mounted the DOM elements
    const timeout = setTimeout(() => {
      const scrollContainer = document.getElementById("slot-picker-scroll-container")
      const trigger = document.getElementById("slot-picker-load-more-trigger")
      
      if (!trigger) return

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 24, filteredResults.length))
          }
        },
        { 
          root: scrollContainer,
          threshold: 0.1, 
          rootMargin: "400px" 
        }
      )

      observer.observe(trigger)

      // Clean up on unmount or re-render
      return () => {
        observer.disconnect()
      }
    }, 100)

    return () => clearTimeout(timeout)
  }, [visibleCount, filteredResults.length, isOpen])

  const visibleResults = useMemo(() => {
    return filteredResults.slice(0, visibleCount)
  }, [filteredResults, visibleCount])

  const titleText =
    filterKind === "skill"
      ? "Select Primary Skill"
      : filterKind === "collection"
      ? "Select Collection Stack"
      : "Select Tool"

  const descriptionText =
    filterKind === "skill"
      ? "Browse and select a secure preconfigured skill to wire into your agent."
      : filterKind === "collection"
      ? "Select a preconfigured bundle of skills and tools aligned for specific outcomes."
      : "Browse and select an executable tool to empower your agent's runtime capabilities."

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="!w-full md:!w-[45vw] lg:!w-[33vw] !max-w-none p-6 overflow-y-auto flex flex-col h-full bg-background border-l border-[var(--ironhub-line)] shadow-[var(--ironhub-shadow)]"
      >
        <SheetHeader className="pb-4 border-b border-border/40">
          <SheetTitle className="text-xl font-bold font-heading text-foreground">
            {titleText}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground mt-1 text-sm">
            {descriptionText}
          </SheetDescription>
        </SheetHeader>

        {/* Modal Filter Toolbar */}
        <div className="grid gap-3 py-4 border-b border-border/30">
          <InputGroup className="h-10">
            <InputGroupAddon>
              <IconSearch className="size-4 text-muted-foreground/80" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${
                filterKind === "skill"
                  ? "skills"
                  : filterKind === "collection"
                  ? "collections"
                  : "tools"
              }...`}
              className="text-sm"
            />
          </InputGroup>

          {filterKind !== "collection" && (
            <div className="flex gap-2.5">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 flex-1 gap-2 text-xs">
                  <IconCategory className="size-3.5 opacity-70" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sort}
                onValueChange={(val) => setSort(val as SortMode)}
              >
                <SelectTrigger className="h-10 flex-1 gap-2 text-xs">
                  <IconSortAscending className="size-3.5 opacity-70" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="actions">Actions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Picker Content Grid */}
        <div id="slot-picker-scroll-container" className="flex-1 min-h-0 overflow-y-auto py-5">
          {filteredResults.length > 0 ? (
            <div className="grid gap-4 grid-cols-1">
              {(visibleResults as (CatalogItem | CollectionBundle)[]).map((item) => {
                const isEquipped = equippedSlugs.includes(item.slug)

                if (filterKind === "collection") {
                  const collection = item as CollectionBundle
                  return (
                    <Card
                      key={collection.slug}
                      className={cn(
                        "group relative overflow-hidden border border-border/60 bg-card p-4 transition-all duration-300 hover:shadow-md",
                        isEquipped ? "opacity-60 pointer-events-none" : "hover:border-primary/30 hover:bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                          <IconBoxMultiple className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {collection.title}
                            </h4>
                            <Button
                              size="xs"
                              variant={isEquipped ? "outline" : "default"}
                              className={cn(
                                "rounded-lg text-[11px] h-7 font-extrabold px-3 shrink-0 cursor-pointer",
                                !isEquipped && "bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/10"
                              )}
                              disabled={isEquipped}
                              onClick={() => {
                                onSelect(collection)
                                onClose()
                              }}
                            >
                              {isEquipped ? "Equipped" : "Equip"}
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {collection.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-2.5">
                            <span className="inline-flex items-center rounded-md bg-primary/5 px-1.5 py-0.5 text-[10px] font-extrabold text-primary border border-primary/10">
                              {collection.toolCount} tools
                            </span>
                            <span className="inline-flex items-center rounded-md bg-yellow-500/5 px-1.5 py-0.5 text-[10px] font-extrabold text-yellow-500 border border-yellow-500/10">
                              {collection.skillCount} skills
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                }

                const catalogItem = item as CatalogItem
                return (
                  <CatalogCard
                    key={catalogItem.slug}
                    item={catalogItem}
                    compact={false}
                    onSelect={(selectedItem) => {
                      onSelect(selectedItem)
                      onClose()
                    }}
                    selectText={isEquipped ? "Equipped" : "Equip Slot"}
                    disabled={isEquipped}
                  />
                )
              })}
              
              {visibleCount < filteredResults.length && (
                <div 
                  id="slot-picker-load-more-trigger" 
                  className="h-10 w-full flex items-center justify-center opacity-50"
                >
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1" />
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1 delay-75" />
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1 delay-150" />
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed bg-muted/10">
              <CardContent className="text-muted-foreground text-center text-sm py-12">
                No matching {
                  filterKind === "skill"
                    ? "skills"
                    : filterKind === "collection"
                    ? "collections"
                    : "tools"
                } found. Try clearing your search query or filters.
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
