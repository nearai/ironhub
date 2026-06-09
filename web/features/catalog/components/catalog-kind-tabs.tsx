"use client"

import {
  IconBoxMultiple,
  IconLayoutGrid,
  IconSparkles,
  IconTool,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/shared/utils"
import type { CatalogFilterKind } from "./catalog-filter-types"

type CatalogKindTabsProps = {
  value: CatalogFilterKind
  compact?: boolean
  onChange: (value: CatalogFilterKind) => void
}

const kindOptions: CatalogFilterKind[] = ["all", "tool", "skill", "collection"]

const kindIcons = {
  all: IconLayoutGrid,
  tool: IconTool,
  skill: IconSparkles,
  collection: IconBoxMultiple,
}

function getKindLabel(value: CatalogFilterKind) {
  if (value === "all") return "All"
  if (value === "collection") return "Collections"
  return `${value}s`
}

export function CatalogKindTabs({
  value,
  compact,
  onChange,
}: CatalogKindTabsProps) {
  return (
    <ButtonGroup className="shrink-0">
      {kindOptions.map((option) => {
        const Icon = kindIcons[option]
        return (
          <Button
            key={option}
            type="button"
            variant={value === option ? "default" : "outline"}
            className={cn(
              "h-10 rounded-full px-4 transition-all duration-300 lg:h-11 lg:px-5",
              compact && "lg:h-9 lg:px-3.5"
            )}
            onClick={() => onChange(option)}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Icon
                className={cn(
                  "size-3.5 transition-all duration-300",
                  compact && "lg:size-3"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium capitalize transition-all duration-300",
                  compact && "lg:text-xs"
                )}
              >
                {getKindLabel(option)}
              </span>
            </div>
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
