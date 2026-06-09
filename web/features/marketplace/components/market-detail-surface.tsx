"use client"

import { useState } from "react"
import type { CatalogItem } from "@/lib/catalog/types"
import { cn } from "@/lib/shared/utils"
import { MarketDetailArtifact } from "./market-detail-artifact"
import { MarketDetailConstraints } from "./market-detail-constraints"
import { MarketDetailNote } from "./market-detail-note"
import { MarketDetailSecurity } from "./market-detail-security"
import { MarketDetailSpecs } from "./market-detail-specs"
import { MarketDetailToggle } from "./market-detail-toggle"

type MarketDetailSurfaceProps = {
  item: CatalogItem
}

export function MarketDetailSurface({ item }: MarketDetailSurfaceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const techTags = item.tags.filter((tag) => !item.valueTags.includes(tag))

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-[var(--ironhub-line)] bg-card/60 shadow-[var(--ironhub-shadow)] backdrop-blur-xl transition-all duration-300">
      <MarketDetailToggle
        kind={item.kind}
        isOpen={isOpen}
        onToggle={() => setIsOpen((value) => !value)}
      />

      <div
        id="technical-details-content"
        role="region"
        aria-labelledby="technical-details-trigger"
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-8 p-6 lg:grid-cols-3">
            <MarketDetailSpecs item={item} />
            <MarketDetailSecurity item={item} />
            <MarketDetailConstraints item={item} techTags={techTags} />
          </div>
          <MarketDetailArtifact item={item} />
          <MarketDetailNote item={item} />
        </div>
      </div>
    </div>
  )
}
