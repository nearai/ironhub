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
import type { CatalogItem } from "@/lib/catalog-types"
import type { CollectionBundle } from "@/lib/collection-bundles"
import {
  IconCategory,
  IconSearch,
  IconSortAscending,
  IconBoxMultiple,
  IconLayoutGrid,
  IconSparkles,
  IconTool,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type UniversalSelectionDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onToggle: (item: CatalogItem | CollectionBundle) => void
  skills: CatalogItem[]
  tools: CatalogItem[]
  collections: CollectionBundle[]
  initialTab: "all" | "skill" | "tool" | "collection"
  equippedSkills: string[]
  equippedTools: string[]
  equippedCollections: string[]
}

const TABS = [
  { id: "all", label: "All" },
  { id: "skill", label: "Skills" },
  { id: "tool", label: "Tools" },
  { id: "collection", label: "Collections" },
] as const

export function UniversalSelectionDrawer({
  isOpen,
  onClose,
  onToggle,
  skills,
  tools,
  collections,
  initialTab,
  equippedSkills,
  equippedTools,
  equippedCollections,
}: UniversalSelectionDrawerProps) {
  const [activeTab, setActiveTab] = useState<"all" | "skill" | "tool" | "collection">(initialTab)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState<SortMode>("relevance")

  // Get unique categories
  const categories = useMemo(() => {
    if (activeTab === "collection") return []
    const combined = []
    if (activeTab === "all" || activeTab === "skill") combined.push(...skills)
    if (activeTab === "all" || activeTab === "tool") combined.push(...tools)
    const list = combined.map((item) => item.category).filter(Boolean)
    return Array.from(new Set(list))
  }, [activeTab, skills, tools])

  // Filter and sort items
  const filteredResults = useMemo(() => {
    if (activeTab === "collection") {
      const filtered = filterCollections(collections, query)
      return sortCollections(filtered)
    }
    if (activeTab === "skill") {
      const filtered = filterCatalog(skills, query, "skill", category)
      return sortCatalog(filtered, sort)
    }
    if (activeTab === "tool") {
      const filtered = filterCatalog(tools, query, "tool", category)
      return sortCatalog(filtered, sort)
    }
    if (activeTab === "all") {
      const filteredSkills = filterCatalog(skills, query, "skill", category)
      const filteredTools = filterCatalog(tools, query, "tool", category)
      const filteredCollections = filterCollections(collections, query, category)

      const sortedSkills = sortCatalog(filteredSkills, sort)
      const sortedTools = sortCatalog(filteredTools, sort)
      const sortedCollections = sortCollections(filteredCollections)

      return [...sortedCollections, ...sortedSkills, ...sortedTools]
    }
    return []
  }, [activeTab, skills, tools, collections, query, category, sort])

  const [visibleCount, setVisibleCount] = useState(24)
  const [prevFilteredResults, setPrevFilteredResults] = useState(filteredResults)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  // Reset pagination state when filters change or modal is toggled
  if (filteredResults !== prevFilteredResults || isOpen !== prevIsOpen) {
    setPrevFilteredResults(filteredResults)
    setPrevIsOpen(isOpen)
    setVisibleCount(24)
    if (isOpen && isOpen !== prevIsOpen) {
      setActiveTab(initialTab)
    }
  }

  // Scroll to top when filters/tabs change
  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => {
      const container = document.getElementById("universal-drawer-scroll-container")
      if (container) {
        container.scrollTo({ top: 0, behavior: "smooth" })
      }
    }, 50)
  }, [filteredResults, isOpen])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!isOpen || visibleCount >= filteredResults.length) return

    const timeout = setTimeout(() => {
      const scrollContainer = document.getElementById("universal-drawer-scroll-container")
      const trigger = document.getElementById("universal-drawer-load-more-trigger")
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
          rootMargin: "400px",
        }
      )

      observer.observe(trigger)
      return () => observer.disconnect()
    }, 100)

    return () => clearTimeout(timeout)
  }, [visibleCount, filteredResults.length, isOpen])

  const visibleResults = useMemo(() => {
    return filteredResults.slice(0, visibleCount)
  }, [filteredResults, visibleCount])

  // Helper helper to check equipped status
  const isEquipped = (item: CatalogItem | CollectionBundle) => {
    if (item.kind === "skill") return equippedSkills.includes(item.slug)
    if (item.kind === "tool") return equippedTools.includes(item.slug)
    if (item.kind === "collection") return equippedCollections.includes(item.slug)
    return false
  }

  // Count aggregates
  const selectedSkillsCount = equippedSkills.length
  const selectedToolsCount = equippedTools.length
  const selectedCollectionsCount = equippedCollections.length
  const totalCount = selectedSkillsCount + selectedToolsCount + selectedCollectionsCount

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="!w-full md:!w-[45vw] lg:!w-[35vw] !max-w-none p-0 flex flex-col h-full bg-background border-l border-[var(--ironhub-line)] shadow-[var(--ironhub-shadow)]"
      >
        {/* Header container */}
        <SheetHeader className="p-4 md:p-5 pb-3 border-b border-border/40 gap-0.5">
          <SheetTitle className="text-xl md:text-2xl font-extrabold font-heading text-foreground tracking-tight leading-none">
            Equip Your Agent
          </SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-400 mt-1 text-xs md:text-sm font-semibold leading-normal">
            Select the skills, tools, and collections you want to equip
          </SheetDescription>
        </SheetHeader>

        {/* Toolbar & Segmented Tabs Control */}
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-border/30 flex flex-col gap-3 md:gap-4 bg-muted/20">
          {/* Search bar */}
          <InputGroup className="h-10">
            <InputGroupAddon>
              <IconSearch className="size-4 text-muted-foreground/80" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills, tools, collections..."
              className="text-sm bg-background/50"
            />
          </InputGroup>

          {/* Segmented Control / Tabs */}
          <div className="flex flex-nowrap p-0.5 bg-muted/40 dark:bg-zinc-900/40 rounded-full border border-primary/20 dark:border-zinc-800/80 gap-0 shadow-sm overflow-hidden">
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setCategory("all") // reset category filter
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] md:text-xs font-extrabold transition-all duration-300 cursor-pointer relative whitespace-nowrap rounded-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/25 dark:hover:bg-zinc-800/40",
                    // Delicate divider lines between adjacent inactive tabs
                    idx < TABS.length - 1 && activeTab !== tab.id && activeTab !== TABS[idx + 1].id && "after:content-[''] after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-[1px] after:bg-border/60"
                  )}
                >
                  {tab.id === "all" && <IconLayoutGrid className="size-3.5" />}
                  {tab.id === "skill" && <IconSparkles className="size-3.5" />}
                  {tab.id === "tool" && <IconTool className="size-3.5" />}
                  {tab.id === "collection" && <IconBoxMultiple className="size-3.5" />}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Filters */}
          {activeTab !== "collection" && (
            <div className="flex gap-2.5">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 flex-1 gap-2 text-xs bg-background/50">
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
                <SelectTrigger className="h-10 flex-1 gap-2 text-xs bg-background/50">
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

        {/* Scrollable Content */}
        <div id="universal-drawer-scroll-container" className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-28">
          {filteredResults.length > 0 ? (
            <div className="grid gap-4 grid-cols-1">
              {visibleResults.map((item) => {
                const equipped = isEquipped(item)

                if (item.kind === "collection") {
                  const collection = item as CollectionBundle
                  return (
                    <Card
                      key={collection.slug}
                      className={cn(
                        "group relative overflow-hidden border border-border/60 bg-card p-4 transition-all duration-300 hover:shadow-md",
                        equipped
                          ? "border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]"
                          : "hover:border-primary/30 hover:bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                          equipped
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-primary/20 bg-primary/10 text-primary"
                        )}>
                          <IconBoxMultiple className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {collection.title}
                            </h4>
                            <Button
                              size="xs"
                              variant={equipped ? "secondary" : "default"}
                              className={cn(
                                "rounded-lg text-[11px] h-7 font-extrabold px-3 shrink-0 cursor-pointer transition-all",
                                equipped
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 dark:text-emerald-400"
                                  : "bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/10"
                              )}
                              onClick={() => onToggle(collection)}
                            >
                              {equipped ? "Equipped" : "Equip"}
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
                    isSelected={equipped}
                    selectText={equipped ? "Equipped" : "Equip"}
                    onSelect={() => onToggle(catalogItem)}
                  />
                )
              })}

              {visibleCount < filteredResults.length && (
                <div
                  id="universal-drawer-load-more-trigger"
                  className="h-10 w-full flex items-center justify-center opacity-50"
                >
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1" />
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1 delay-75" />
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full mx-1 delay-150" />
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed bg-muted/10 border-border/80">
              <CardContent className="text-muted-foreground text-center text-sm py-12">
                No matching items found. Try clearing your search query or filters.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sticky Bottom Footer Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {/* Counters aggregate */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-foreground">
              {totalCount} item{totalCount !== 1 ? "s" : ""} selected
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {selectedSkillsCount} Skill{selectedSkillsCount !== 1 ? "s" : ""}, {selectedToolsCount} Tool{selectedToolsCount !== 1 ? "s" : ""}, {selectedCollectionsCount} Collection{selectedCollectionsCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Close button */}
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-6 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm transition-all cursor-pointer"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
