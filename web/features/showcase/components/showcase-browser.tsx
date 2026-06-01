"use client"

import { useState, useMemo, useEffect } from "react"
import type { UseCase, UsecaseCategory } from "@/lib/usecases/types"
import { UseCaseCard } from "./use-case-card"
import { cn } from "@/lib/shared/utils"
import { Input } from "@/components/ui/input"
import { IconSearch, IconCategory, IconPlus } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { sourceLink } from "@/lib/shared/links"

interface ShowcaseBrowserProps {
  useCases: UseCase[]
  categories: UsecaseCategory[]
}

export function ShowcaseBrowser({ useCases, categories }: ShowcaseBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<UsecaseCategory | "All">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(15)

  useEffect(() => {
    setVisibleCount(15)
  }, [selectedCategory, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    useCases.forEach((uc) => {
      uc.categories.forEach((cat) => {
        counts[cat] = (counts[cat] || 0) + 1
      })
    })
    return counts
  }, [useCases])

  const filteredUseCases = useMemo(() => {
    let filtered = useCases

    if (selectedCategory !== "All") {
      filtered = filtered.filter((uc) => uc.categories.includes(selectedCategory))
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (uc) =>
          uc.title.toLowerCase().includes(q) ||
          uc.examplePrompt.toLowerCase().includes(q) ||
          uc.agentDoes.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [useCases, selectedCategory, searchQuery])

  const visibleUseCases = useMemo(() => {
    return filteredUseCases.slice(0, visibleCount)
  }, [filteredUseCases, visibleCount])

  const hasMore = visibleCount < filteredUseCases.length

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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full">
          <div className="flex-1">
            <Select
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(val as UsecaseCategory | "All")}
            >
              <SelectTrigger className="h-10 w-full gap-2 px-4 transition-all duration-300">
                <IconCategory className="size-4 opacity-70 transition-all duration-300" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Use Cases ({useCases.length})</SelectItem>
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
            <a href={sourceLink("web/data/usecases.json")} target="_blank" rel="noreferrer">
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Categories</h3>
              <button
                onClick={() => setSelectedCategory("All")}
                className={cn(
                  "text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedCategory === "All"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All Use Cases <span className="ml-auto opacity-60 text-xs">{useCases.length}</span>
              </button>
              {categories.map((category) => {
                const count = categoryCounts[category] || 0
                if (count === 0) return null
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center",
                      selectedCategory === category
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {category}
                    <span className="ml-auto opacity-60 text-xs">{count}</span>
                  </button>
                )
              })}
              
              <div className="pt-4 border-t border-[var(--ironhub-line)]/50 mt-2">
                <Button asChild variant="outline" className="w-full justify-center gap-1.5 rounded-full text-xs font-semibold">
                  <a href={sourceLink("web/data/usecases.json")} target="_blank" rel="noreferrer">
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
            {visibleUseCases.map((uc) => (
              <div key={uc.id} className="break-inside-avoid w-full">
                <UseCaseCard useCase={uc} />
              </div>
            ))}
            {filteredUseCases.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No use cases found for this category.
              </div>
            )}
          </div>
          
          {hasMore && (
            <div className="flex justify-center pt-4 pb-12">
              <button
                onClick={() => setVisibleCount((prev) => prev + 15)}
                className="px-6 py-2.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-colors"
              >
                Load More Use Cases
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
