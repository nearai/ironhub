"use client"

import { useMemo, useState, useEffect } from "react"
import {
  IconCategory,
  IconSearch,
  IconSortAscending,
  IconBoxMultiple,
  IconLayoutGrid,
  IconSparkles,
  IconTool,
  IconX,
} from "@tabler/icons-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CatalogCard } from "@/features/catalog/components/catalog-card"
import {
  filterCatalog,
  sortCatalog,
  filterCollections,
  sortCollections,
  type SortMode,
} from "@/lib/catalog/utils"
import type { CatalogItem } from "@/lib/catalog/types"
import type { CollectionBundle } from "@/lib/catalog/collections"
import { cn } from "@/lib/shared/utils"

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
  const [activeTab, setActiveTab] = useState<
    "all" | "skill" | "tool" | "collection"
  >(initialTab)
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
      const filteredCollections = filterCollections(
        collections,
        query,
        category
      )

      const sortedSkills = sortCatalog(filteredSkills, sort)
      const sortedTools = sortCatalog(filteredTools, sort)
      const sortedCollections = sortCollections(filteredCollections)

      return [...sortedCollections, ...sortedSkills, ...sortedTools]
    }
    return []
  }, [activeTab, skills, tools, collections, query, category, sort])

  const [visibleCount, setVisibleCount] = useState(24)
  const [prevFilteredResults, setPrevFilteredResults] =
    useState(filteredResults)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)

  // Reset pagination state when filters change, modal is toggled, or initial tab changes
  if (
    filteredResults !== prevFilteredResults ||
    isOpen !== prevIsOpen ||
    initialTab !== prevInitialTab
  ) {
    setPrevFilteredResults(filteredResults)
    setPrevIsOpen(isOpen)
    setPrevInitialTab(initialTab)
    setVisibleCount(24)

    if (initialTab !== prevInitialTab) {
      setActiveTab(initialTab)
    } else if (isOpen && isOpen !== prevIsOpen) {
      setActiveTab(initialTab)
    }
  }

  // Scroll to top when filters/tabs change
  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => {
      const container = document.getElementById(
        "universal-drawer-scroll-container"
      )
      if (container) {
        container.scrollTo({ top: 0, behavior: "smooth" })
      }
    }, 50)
  }, [filteredResults, isOpen])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!isOpen || visibleCount >= filteredResults.length) return

    const timeout = setTimeout(() => {
      const scrollContainer = document.getElementById(
        "universal-drawer-scroll-container"
      )
      const trigger = document.getElementById(
        "universal-drawer-load-more-trigger"
      )
      if (!trigger) return

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) =>
              Math.min(prev + 24, filteredResults.length)
            )
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
    if (item.kind === "collection")
      return equippedCollections.includes(item.slug)
    return false
  }

  // Count aggregates
  const selectedSkillsCount = equippedSkills.length
  const selectedToolsCount = equippedTools.length
  const selectedCollectionsCount = equippedCollections.length
  const totalCount =
    selectedSkillsCount + selectedToolsCount + selectedCollectionsCount

  return (
    <>
      {/* Mobile backdrop - only visible on small screens when open */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={cn(
          // Base mobile
          "fixed inset-y-0 right-0 z-50 w-[85vw] max-w-[400px] bg-background shadow-2xl transition-transform duration-300 ease-in-out",
          // Base desktop
          "lg:sticky lg:top-16 lg:z-30 lg:h-[calc(100vh-4rem)] lg:flex-shrink-0 lg:border-l lg:border-[var(--ironhub-line)] lg:shadow-none lg:transition-all lg:duration-300 lg:ease-in-out",
          // Open/Close states
          isOpen
            ? "translate-x-0 lg:w-[400px] lg:translate-x-0 lg:opacity-100"
            : "translate-x-full lg:w-0 lg:translate-x-0 lg:border-none lg:opacity-0",
          "flex flex-col overflow-hidden"
        )}
      >
        <div className="flex h-full w-[85vw] max-w-[400px] flex-col lg:w-[400px]">
          {/* Header container */}
          <div className="relative flex flex-col justify-center border-b border-border/40 px-4 py-3 md:px-5 md:py-3.5">
            <h2 className="font-heading text-lg leading-none font-bold tracking-tight text-foreground md:text-xl">
              Equip Your Agent
            </h2>
            <p className="mt-1 text-[11px] leading-normal font-medium text-slate-500 dark:text-slate-400">
              Select the skills, tools, and collections to equip.
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:bg-muted lg:hidden"
            >
              <IconX className="size-4" />
            </Button>
          </div>

          {/* Toolbar & Segmented Tabs Control */}
          <div className="flex flex-col gap-3 border-b border-border/30 bg-muted/20 px-4 py-3 md:gap-4 md:px-5 md:py-4">
            {/* Search bar */}
            <InputGroup className="h-10">
              <InputGroupAddon>
                <IconSearch className="size-4 text-muted-foreground/80" />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills, tools, collections..."
                className="bg-background/50 text-sm"
              />
            </InputGroup>

            {/* Segmented Control / Tabs */}
            <div className="flex flex-nowrap gap-0 overflow-hidden rounded-full border border-primary/20 bg-muted/40 p-0.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
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
                      "relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-1 py-1.5 text-[10px] font-extrabold whitespace-nowrap transition-all duration-300 md:text-[11px]",
                      isActive
                        ? "bg-primary font-black text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/25 hover:text-foreground dark:hover:bg-zinc-800/40",
                      // Delicate divider lines between adjacent inactive tabs
                      idx < TABS.length - 1 &&
                        activeTab !== tab.id &&
                        activeTab !== TABS[idx + 1].id &&
                        "after:absolute after:top-1/4 after:right-0 after:h-1/2 after:w-[1px] after:bg-border/60 after:content-['']"
                    )}
                  >
                    {tab.id === "all" && (
                      <IconLayoutGrid className="size-3.5" />
                    )}
                    {tab.id === "skill" && (
                      <IconSparkles className="size-3.5" />
                    )}
                    {tab.id === "tool" && <IconTool className="size-3.5" />}
                    {tab.id === "collection" && (
                      <IconBoxMultiple className="size-3.5" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Filters */}
            {activeTab !== "collection" && (
              <div className="flex gap-2.5">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 flex-1 gap-2 bg-background/50 text-xs">
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
                  <SelectTrigger className="h-10 flex-1 gap-2 bg-background/50 text-xs">
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
          <div
            id="universal-drawer-scroll-container"
            className="min-h-0 flex-1 overflow-y-auto px-6 py-4 pb-28"
          >
            {filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
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
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                              equipped
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-primary/20 bg-primary/10 text-primary"
                            )}
                          >
                            <IconBoxMultiple className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                                {collection.title}
                              </h4>
                              <Button
                                size="xs"
                                variant={equipped ? "secondary" : "default"}
                                className={cn(
                                  "h-7 shrink-0 cursor-pointer rounded-lg px-3 text-[11px] font-extrabold transition-all",
                                  equipped
                                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive dark:text-emerald-400"
                                    : "bg-primary text-primary-foreground shadow-sm shadow-primary/10 hover:bg-primary/95"
                                )}
                                onClick={() => onToggle(collection)}
                              >
                                {equipped ? "Equipped" : "Equip"}
                              </Button>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {collection.summary}
                            </p>
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="inline-flex items-center rounded-md border border-primary/10 bg-primary/5 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                                {collection.toolCount} tools
                              </span>
                              <span className="inline-flex items-center rounded-md border border-yellow-500/10 bg-yellow-500/5 px-1.5 py-0.5 text-[10px] font-extrabold text-yellow-500">
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
                    className="flex h-10 w-full items-center justify-center opacity-50"
                  >
                    <div className="mx-1 h-2 w-2 animate-pulse rounded-full bg-primary" />
                    <div className="mx-1 h-2 w-2 animate-pulse rounded-full bg-primary delay-75" />
                    <div className="mx-1 h-2 w-2 animate-pulse rounded-full bg-primary delay-150" />
                  </div>
                )}
              </div>
            ) : (
              <Card className="border-dashed border-border/80 bg-muted/10">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No matching items found. Try clearing your search query or
                  filters.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sticky Bottom Footer Action Bar */}
          <div className="absolute right-0 bottom-0 left-0 z-10 flex flex-col gap-3 border-t border-border bg-background/95 px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            {/* Counters aggregate */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">
                {totalCount} item{totalCount !== 1 ? "s" : ""} selected
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {selectedSkillsCount} Skill
                {selectedSkillsCount !== 1 ? "s" : ""}, {selectedToolsCount}{" "}
                Tool{selectedToolsCount !== 1 ? "s" : ""},{" "}
                {selectedCollectionsCount} Collection
                {selectedCollectionsCount !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Close button */}
            <Button
              type="button"
              onClick={onClose}
              className="h-10 w-full cursor-pointer rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 sm:w-auto"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
