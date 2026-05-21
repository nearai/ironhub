import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailArtifactProps = {
  item: CatalogItem
}

export function MarketDetailArtifact({ item }: MarketDetailArtifactProps) {
  if (item.origin !== "iliad") return null

  return (
    <div className="border-t border-border/30 bg-muted/10 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">
            Artifact Path
          </span>
          <span className="font-mono text-xs break-all text-muted-foreground">
            {item.contentPath}
          </span>
        </div>
        {item.capabilitiesUrl && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            Capabilities Enabled
          </Badge>
        )}
      </div>
    </div>
  )
}
