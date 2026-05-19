"use client"

import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"
import { cn } from "@/lib/shared/utils"

type MarketDetailToggleProps = {
  kind: CatalogItem["kind"]
  isOpen: boolean
  onToggle: () => void
}

export function MarketDetailToggle({
  kind,
  isOpen,
  onToggle,
}: MarketDetailToggleProps) {
  return (
    <button
      id="technical-details-trigger"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="technical-details-content"
      className={cn(
        "flex w-full items-center justify-between bg-muted/30 px-5 py-3 text-left transition-colors hover:bg-muted/50 dark:bg-muted/15 dark:hover:bg-muted/25",
        isOpen && "border-b border-border/30"
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase">
          Developer & Technical Details
        </h3>
        <Badge variant="outline" className="h-4 border-border/30 text-[10px]">
          {kind}
        </Badge>
      </div>
      {isOpen ? (
        <IconChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <IconChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )
}
