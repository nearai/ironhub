"use client"

import {
  IconBoxMultiple,
  IconCategory,
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconSortAscending,
  IconSparkles,
  IconTool,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ViewMode } from "@/hooks/use-catalog-browser"
import type { CatalogKind } from "@/lib/catalog-types"
import type { SortMode } from "@/lib/catalog-utils"

type CatalogFiltersProps = {
  query: string
  onQueryChange: (value: string) => void
  kind: CatalogKind | "all"
  onKindChange: (value: CatalogKind | "all") => void
  category: string
  onCategoryChange: (value: string) => void
  sort: SortMode
  onSortChange: (value: SortMode) => void
  view: ViewMode
  onViewChange: (value: ViewMode) => void
  categories: string[]
  compact?: boolean
}

export function CatalogFilters(props: CatalogFiltersProps) {
  const compact = props.compact

  return (
    <div className={cn("grid gap-3 transition-all duration-300", compact && "lg:gap-1.5")}>
      <InputGroup className={cn("h-11 transition-all duration-300", compact && "lg:h-9")}>
        <InputGroupAddon>
          <IconSearch className={cn("size-4 transition-all duration-300", compact && "lg:size-3.5")} />
        </InputGroupAddon>
        <InputGroupInput
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search Skills and Tools..."
          className={cn("transition-all duration-300", compact && "lg:h-9 lg:py-1 lg:text-sm")}
        />
      </InputGroup>

      <div className={cn(
        "flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide lg:flex-wrap lg:overflow-visible lg:pb-0 transition-all duration-300",
        compact && "lg:pb-0"
      )}>
        <div className={cn("flex items-center gap-2 transition-all duration-300", compact && "lg:gap-3")}>
          <ButtonGroup className="shrink-0">
            {(["all", "tool", "skill", "collection"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                variant={props.kind === value ? "default" : "outline"}
                className={cn(
                  "h-10 rounded-full px-4 lg:h-11 lg:px-5 transition-all duration-300",
                  compact && "lg:h-9 lg:px-3.5"
                )}
                onClick={() => props.onKindChange(value)}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {value === "all" && <IconLayoutGrid className={cn("size-3.5 transition-all duration-300", compact && "lg:size-3")} />}
                  {value === "tool" && <IconTool className={cn("size-3.5 transition-all duration-300", compact && "lg:size-3")} />}
                  {value === "skill" && <IconSparkles className={cn("size-3.5 transition-all duration-300", compact && "lg:size-3")} />}
                  {value === "collection" && <IconBoxMultiple className={cn("size-3.5 transition-all duration-300", compact && "lg:size-3")} />}
                  <span className={cn("text-sm font-medium capitalize transition-all duration-300", compact && "lg:text-xs")}>
                    {value === "all" ? "All" : value === "collection" ? "Collections" : `${value}s`}
                  </span>
                </div>
              </Button>
            ))}
          </ButtonGroup>

          <div className="flex shrink-0 items-center gap-2">
            <Select value={props.category} onValueChange={props.onCategoryChange}>
              <SelectTrigger className={cn(
                "h-10 w-auto gap-2 px-4 lg:h-11 lg:w-[180px] transition-all duration-300",
                compact && "lg:h-9 lg:w-[145px] lg:px-3 lg:text-xs"
              )}>
                <IconCategory className={cn("size-4 opacity-70 transition-all duration-300", compact && "lg:size-3.5")} />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {props.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={props.sort}
              onValueChange={(value) => props.onSortChange(value as SortMode)}
            >
              <SelectTrigger className={cn(
                "h-10 w-auto gap-2 px-4 lg:h-11 lg:w-[160px] transition-all duration-300",
                compact && "lg:h-9 lg:w-[125px] lg:px-3 lg:text-xs"
              )}>
                <IconSortAscending className={cn("size-4 opacity-70 transition-all duration-300", compact && "lg:size-3.5")} />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="actions">Actions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ButtonGroup className="ml-auto shrink-0 hidden lg:flex transition-all duration-300">
          <Button
            type="button"
            variant={props.view === "grid" ? "default" : "outline"}
            size="icon"
            className={cn("h-11 w-11 rounded-full transition-all duration-300", compact && "lg:h-9 lg:w-9")}
            onClick={() => props.onViewChange("grid")}
            aria-label="Grid view"
          >
            <IconLayoutGrid className={cn("size-5 transition-all duration-300", compact && "lg:size-4")} />
          </Button>
          <Button
            type="button"
            variant={props.view === "list" ? "default" : "outline"}
            size="icon"
            className={cn("h-11 w-11 rounded-full transition-all duration-300", compact && "lg:h-9 lg:w-9")}
            onClick={() => props.onViewChange("list")}
            aria-label="List view"
          >
            <IconList className={cn("size-5 transition-all duration-300", compact && "lg:size-4")} />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  )
}
