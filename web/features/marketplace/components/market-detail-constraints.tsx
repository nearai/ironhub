import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailConstraintsProps = {
  item: CatalogItem
  techTags: string[]
}

export function MarketDetailConstraints({
  item,
  techTags,
}: MarketDetailConstraintsProps) {
  return (
    <div className="space-y-4 border-t border-border/20 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
      <h4 className="text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
        Constraints & Tags
      </h4>
      <div className="space-y-3">
        {item.limits.length > 0 && (
          <div className="space-y-1">
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
              Known Limits
            </span>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
              {item.limits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
          </div>
        )}
        {techTags.length > 0 && (
          <div>
            <span className="mb-2 block text-[10px] font-semibold text-muted-foreground uppercase">
              Technical Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {techTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
