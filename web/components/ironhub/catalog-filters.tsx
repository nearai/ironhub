"use client"

import {
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
}

export function CatalogFilters(props: CatalogFiltersProps) {
  return (
    <div className="grid gap-3">
      <InputGroup className="h-11">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search skills and tools..."
        />
      </InputGroup>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide lg:flex-wrap lg:overflow-visible lg:pb-0">
        <ButtonGroup className="shrink-0">
          {(["all", "tool", "skill"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={props.kind === value ? "default" : "outline"}
              className="h-10 rounded-full px-4 lg:h-11 lg:px-5"
              onClick={() => props.onKindChange(value)}
            >
              <div className="flex items-center justify-center gap-1.5">
                {value === "all" && <IconLayoutGrid className="size-3.5" />}
                {value === "tool" && <IconTool className="size-3.5" />}
                {value === "skill" && <IconSparkles className="size-3.5" />}
                <span className="text-sm font-medium capitalize">
                  {value === "all" ? "All" : `${value}s`}
                </span>
              </div>
            </Button>
          ))}
        </ButtonGroup>

        <div className="flex shrink-0 items-center gap-2">
          <Select value={props.category} onValueChange={props.onCategoryChange}>
            <SelectTrigger className="h-10 w-auto gap-2 px-4 lg:h-11 lg:w-[180px]">
              <IconCategory className="size-4 opacity-70" />
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
            <SelectTrigger className="h-10 w-auto gap-2 px-4 lg:h-11 lg:w-[160px]">
              <IconSortAscending className="size-4 opacity-70" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="actions">Actions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ButtonGroup className="ml-auto shrink-0 hidden lg:flex">
          <Button
            type="button"
            variant={props.view === "grid" ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => props.onViewChange("grid")}
            aria-label="Grid view"
          >
            <IconLayoutGrid />
          </Button>
          <Button
            type="button"
            variant={props.view === "list" ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => props.onViewChange("list")}
            aria-label="List view"
          >
            <IconList />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  )
}
