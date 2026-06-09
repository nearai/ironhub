"use client"

import { IconLayoutGrid, IconList } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/shared/utils"
import type { ViewMode } from "@/features/catalog/hooks/use-catalog-browser"

type CatalogViewToggleProps = {
  value: ViewMode
  compact?: boolean
  onChange: (value: ViewMode) => void
}

export function CatalogViewToggle({
  value,
  compact,
  onChange,
}: CatalogViewToggleProps) {
  return (
    <ButtonGroup className="ml-auto hidden shrink-0 transition-all duration-300 lg:flex">
      <Button
        type="button"
        variant={value === "grid" ? "default" : "outline"}
        size="icon"
        className={cn(
          "h-11 w-11 rounded-full transition-all duration-300",
          compact && "lg:h-9 lg:w-9"
        )}
        onClick={() => onChange("grid")}
        aria-label="Grid view"
      >
        <IconLayoutGrid
          className={cn(
            "size-5 transition-all duration-300",
            compact && "lg:size-4"
          )}
        />
      </Button>
      <Button
        type="button"
        variant={value === "list" ? "default" : "outline"}
        size="icon"
        className={cn(
          "h-11 w-11 rounded-full transition-all duration-300",
          compact && "lg:h-9 lg:w-9"
        )}
        onClick={() => onChange("list")}
        aria-label="List view"
      >
        <IconList
          className={cn(
            "size-5 transition-all duration-300",
            compact && "lg:size-4"
          )}
        />
      </Button>
    </ButtonGroup>
  )
}
