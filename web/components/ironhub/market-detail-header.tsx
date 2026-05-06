import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogIcon } from "@/components/ironhub/catalog-icon"
import { StatusBadge } from "@/components/ironhub/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"

type MarketDetailHeaderProps = {
  item: CatalogItem
}

export function MarketDetailHeader({ item }: MarketDetailHeaderProps) {
  const sourceLabel =
    item.origin === "iliad" ? `Download ${item.kind}` : "Open source"
  const setupLabel = item.origin === "iliad" ? "Open Iliad" : "View setup"
  const setupHref =
    item.origin === "iliad"
      ? (item.links.docs ?? item.links.source)
      : (item.links.setup ?? item.links.docs ?? item.links.source)

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <CatalogIcon item={item} />
          <div>
            <StatusBadge item={item} />
            <h1 className="mt-4 font-heading text-4xl font-semibold">
              {item.name}
            </h1>
            <div className="mt-3 max-w-3xl space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                {item.valueProp ?? item.description}
              </p>
              {item.valueProp && item.valueProp !== item.description && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50 mb-1">
                    Technical Overview
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground/70">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href={item.links.source} external>
            {sourceLabel}
          </ActionLink>
          <ActionLink href={setupHref} external variant="default">
            {setupLabel}
          </ActionLink>
        </div>
      </CardContent>
    </Card>
  )
}
