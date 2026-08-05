"use client"

import { useState, useEffect } from "react"
import type { UseCase, UsecaseCategory } from "@/lib/usecases/types"
import { UseCaseCard } from "./use-case-card"
import { cn } from "@/lib/shared/utils"
import { Input } from "@/components/ui/input"
import {
  IconSearch,
  IconCategory,
  IconPlus,
  IconLayoutGrid,
  IconTerminal2,
  IconDatabase,
  IconShield,
  IconAdjustments,
  IconMessage2,
  IconBolt,
  IconBrain,
  IconHexagon,
} from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { links } from "@/lib/shared/links"

function useDebounce<T>(value: T, delay = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const useCaseIssueUrl = `${links.repo}/issues/new?template=usecase.yml`

const categoryIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  all: IconLayoutGrid,
  "dev tools": IconTerminal2,
  "data & apis": IconDatabase,
  security: IconShield,
  automation: IconAdjustments,
  communication: IconMessage2,
  productivity: IconBolt,
  "ai & ml": IconBrain,
  web3: IconHexagon,
}

interface ShowcaseBrowserProps {
  initialUseCases: UseCase[]
  categories: UsecaseCategory[]
  categoryCounts: Record<string, number>
  initialTotal: number
  initialHasMore: boolean
  totalAllCount: number
}

export function ShowcaseBrowser({
  initialUseCases,
  categories,
  categoryCounts,
  initialTotal,
  initialHasMore,
  totalAllCount,
}: ShowcaseBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    UsecaseCategory | "All"
  >("All")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 150)

  const [useCases, setUseCases] = useState<UseCase[]>(initialUseCases)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch filtered/searched use cases from the API
  useEffect(() => {
    let active = true

    // Skip initial fetch on mount if filters are empty
    const isInitial =
      selectedCategory === "All" &&
      debouncedSearchQuery.trim() === "" &&
      page === 1
    if (isInitial) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseCases(initialUseCases)
      setHasMore(initialHasMore)
      return
    }

    async function fetchFiltered() {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/usecases?category=${encodeURIComponent(selectedCategory)}&searchQuery=${encodeURIComponent(debouncedSearchQuery)}&page=1&limit=15`
        )
        const data = await res.json()
        if (active) {
          setUseCases(data.useCases)
          // setTotalCount(data.total)
          setHasMore(data.hasMore)
          setPage(1)
        }
      } catch (err) {
        console.error("Error fetching usecases:", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchFiltered()

    return () => {
      active = false
    }
  }, [
    selectedCategory,
    debouncedSearchQuery,
    initialUseCases,
    initialTotal,
    initialHasMore,
    page,
  ])

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    const nextPage = page + 1
    try {
      const res = await fetch(
        `/api/usecases?category=${encodeURIComponent(selectedCategory)}&searchQuery=${encodeURIComponent(debouncedSearchQuery)}&page=${nextPage}&limit=15`
      )
      const data = await res.json()
      setUseCases((prev) => [...prev, ...data.useCases])
      // setTotalCount(data.total)
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch (err) {
      console.error("Error loading more usecases:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      {/* Mobile/Tablet Category Filter & Search */}
      <div className="sticky top-16 z-30 -mx-4 flex flex-col gap-3 border-b border-[var(--ironhub-line)] bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="relative">
          <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search use cases..."
            className="h-10 pl-9 transition-all"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
            }}
          />
        </div>
        <div className="flex w-full gap-2">
          <div className="flex-1">
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val as UsecaseCategory | "All")
              }}
            >
              <SelectTrigger className="h-10 w-full gap-2 px-4 transition-all duration-300">
                <IconCategory className="size-4 opacity-70 transition-all duration-300" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">
                  All Use Cases ({totalAllCount})
                </SelectItem>
                {categories.map((category) => {
                  const count = categoryCounts[category] || 0
                  if (count === 0) return null
                  return (
                    <SelectItem key={category} value={category}>
                      {category} ({count})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-10 shrink-0 rounded-full px-3"
            aria-label="Submit Use Case"
          >
            <a href={useCaseIssueUrl} target="_blank" rel="noreferrer">
              <IconPlus className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid w-full min-w-0 gap-10 lg:grid-cols-[240px_1fr]">
        {/* Desktop Sidebar Filter */}
        <aside className="hidden lg:block">
          <div className="sticky top-[5.5rem] flex flex-col gap-6">
            <div className="relative">
              <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search use cases..."
                className="h-10 pl-9 transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Categories
              </h3>
              <button
                onClick={() => {
                  setSelectedCategory("All")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                  selectedCategory === "All"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <IconLayoutGrid className="size-4 shrink-0 opacity-70" />
                <span>All Use Cases</span>
                <span className="ml-auto text-xs opacity-60">
                  {totalAllCount}
                </span>
              </button>
              {categories.map((category) => {
                const count = categoryCounts[category] || 0
                if (count === 0) return null
                const Icon =
                  categoryIcons[category.toLowerCase()] || IconCategory
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                      selectedCategory === category
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-70" />
                    <span>{category}</span>
                    <span className="ml-auto text-xs opacity-60">{count}</span>
                  </button>
                )
              })}

              <div className="mt-2 border-t border-[var(--ironhub-line)]/50 pt-4">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-center gap-1.5 rounded-full text-xs font-semibold"
                >
                  <a href={useCaseIssueUrl} target="_blank" rel="noreferrer">
                    <IconPlus className="size-3.5" />
                    <span>Submit Use Case</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Masonry Grid */}
        <div className="flex w-full min-w-0 flex-col gap-8">
          <div className="w-full columns-1 gap-6 space-y-6 sm:columns-2 xl:columns-3">
            {useCases.map((uc) => (
              <div key={uc.id} className="w-full break-inside-avoid">
                <UseCaseCard useCase={uc} />
              </div>
            ))}
            {useCases.length === 0 && !isLoading && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No use cases found for this category.
              </div>
            )}
            {useCases.length === 0 && isLoading && (
              <div className="col-span-full animate-pulse py-12 text-center text-muted-foreground">
                Searching use cases...
              </div>
            )}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4 pb-12">
              <button
                disabled={isLoading}
                onClick={handleLoadMore}
                className="rounded-full border border-primary/20 bg-primary/5 px-6 py-2.5 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load More Use Cases"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
