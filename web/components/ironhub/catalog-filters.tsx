"use client"

import { IconLayoutGrid, IconList, IconSearch } from "@tabler/icons-react"
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
      <InputGroup>
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search skills and tools..."
        />
      </InputGroup>
      <div className="flex flex-wrap gap-2">
        <ButtonGroup>
          {(["all", "tool", "skill"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={props.kind === value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => props.onKindChange(value)}
            >
              {value === "all" ? "All" : `${value}s`}
            </Button>
          ))}
        </ButtonGroup>
        <Select value={props.category} onValueChange={props.onCategoryChange}>
          <SelectTrigger>
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
        <Select value={props.sort} onValueChange={(value) => props.onSortChange(value as SortMode)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="actions">Actions</SelectItem>
          </SelectContent>
        </Select>
        <ButtonGroup className="ml-auto">
          <Button
            type="button"
            variant={props.view === "grid" ? "default" : "outline"}
            size="icon"
            className="rounded-full"
            onClick={() => props.onViewChange("grid")}
            aria-label="Grid view"
          >
            <IconLayoutGrid />
          </Button>
          <Button
            type="button"
            variant={props.view === "list" ? "default" : "outline"}
            size="icon"
            className="rounded-full"
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
