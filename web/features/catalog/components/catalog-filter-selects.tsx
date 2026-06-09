"use client"

import { IconCategory, IconSortAscending } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/shared/utils"
import type { SortMode } from "@/lib/catalog/utils"

type CatalogFilterSelectsProps = {
  category: string
  categories: string[]
  sort: SortMode
  compact?: boolean
  onCategoryChange: (value: string) => void
  onSortChange: (value: SortMode) => void
}

export function CatalogFilterSelects({
  category,
  categories,
  sort,
  compact,
  onCategoryChange,
  onSortChange,
}: CatalogFilterSelectsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger
          className={cn(
            "h-10 w-auto gap-2 px-4 transition-all duration-300 lg:h-11 lg:w-[180px]",
            compact && "lg:h-9 lg:w-[145px] lg:px-3 lg:text-xs"
          )}
        >
          <IconCategory
            className={cn(
              "size-4 opacity-70 transition-all duration-300",
              compact && "lg:size-3.5"
            )}
          />
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        onValueChange={(value) => onSortChange(value as SortMode)}
      >
        <SelectTrigger
          className={cn(
            "h-10 w-auto gap-2 px-4 transition-all duration-300 lg:h-11 lg:w-[160px]",
            compact && "lg:h-9 lg:w-[125px] lg:px-3 lg:text-xs"
          )}
        >
          <IconSortAscending
            className={cn(
              "size-4 opacity-70 transition-all duration-300",
              compact && "lg:size-3.5"
            )}
          />
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relevance">Relevance</SelectItem>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="actions">Actions</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
