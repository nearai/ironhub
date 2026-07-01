"use client"

import { useState, useEffect, useRef } from "react"
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

function VirtualizedUseCaseCard({ useCase }: { useCase: UseCase }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div 
      ref={ref} 
      className={cn(
        "w-full transition-all duration-300", 
        !isVisible && "min-h-[220px] bg-muted/10 rounded-2xl border border-[var(--ironhub-line)]/30 overflow-hidden"
      )}
    >
      {isVisible ? (
        <UseCaseCard useCase={useCase} />
      ) : (
        <div className="h-full min-h-[220px] w-full flex items-center justify-center text-muted-foreground/30 text-xs font-medium bg-muted/5 animate-pulse">
          Loading...
        </div>
      )}
    </div>
  )
}

const useCaseIssueUrl = `${links.repo}/issues/new?template=usecase.yml`

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
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
  const [selectedCategory, setSelectedCategory] = useState<UsecaseCategory | "All">("All")
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
    const isInitial = selectedCategory === "All" && debouncedSearchQuery.trim() === "" && page === 1
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
  }, [selectedCategory, debouncedSearchQuery, initialUseCases, initialTotal, initialHasMore, page])

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
    <div className="flex flex-col gap-8 w-full min-w-0">
      {/* Mobile/Tablet Category Filter & Search */}
      <div className="lg:hidden sticky top-16 z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-md border-b border-[var(--ironhub-line)] flex flex-col gap-3">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search use cases..."
            className="pl-9 bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background transition-all"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
            }}
          />
        </div>
        <div className="flex gap-2 w-full">
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
                <SelectItem value="All">All Use Cases ({totalAllCount})</SelectItem>
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
          <Button asChild variant="outline" className="h-10 px-3 shrink-0 rounded-full" aria-label="Submit Use Case">
            <a href={useCaseIssueUrl} target="_blank" rel="noreferrer">
              <IconPlus className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr] w-full min-w-0">
        {/* Desktop Sidebar Filter */}
        <aside className="hidden lg:block">
          <div className="sticky top-[5.5rem] flex flex-col gap-6">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search use cases..."
                className="pl-9 bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                }}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Categories</h3>
              <button
                onClick={() => {
                  setSelectedCategory("All")
                }}
                className={cn(
                  "text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 w-full",
                  selectedCategory === "All"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <IconLayoutGrid className="size-4 shrink-0 opacity-70" />
                <span>All Use Cases</span>
                <span className="ml-auto opacity-60 text-xs">{totalAllCount}</span>
              </button>
              {categories.map((category) => {
                const count = categoryCounts[category] || 0
                if (count === 0) return null
                const Icon = categoryIcons[category.toLowerCase()] || IconCategory
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category)
                    }}
                    className={cn(
                      "text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 w-full",
                      selectedCategory === category
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-70" />
                    <span>{category}</span>
                    <span className="ml-auto opacity-60 text-xs">{count}</span>
                  </button>
                )
              })}
              
              <div className="pt-4 border-t border-[var(--ironhub-line)]/50 mt-2">
                <Button asChild variant="outline" className="w-full justify-center gap-1.5 rounded-full text-xs font-semibold">
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
        <div className="flex flex-col gap-8 w-full min-w-0">
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-6 space-y-6 w-full">
            {useCases.map((uc) => (
              <div key={uc.id} className="break-inside-avoid w-full">
                <VirtualizedUseCaseCard useCase={uc} />
              </div>
            ))}
            {useCases.length === 0 && !isLoading && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No use cases found for this category.
              </div>
            )}
            {useCases.length === 0 && isLoading && (
              <div className="col-span-full py-12 text-center text-muted-foreground animate-pulse">
                Searching use cases...
              </div>
            )}
          </div>
          
          {hasMore && (
            <div className="flex justify-center pt-4 pb-12">
              <button
                disabled={isLoading}
                onClick={handleLoadMore}
                className="px-6 py-2.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium hover:bg-primary/10 disabled:opacity-50 transition-colors"
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

