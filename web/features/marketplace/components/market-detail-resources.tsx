import { ActionLink } from "@/features/shell/components/action-link"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailResourcesProps = {
  item: CatalogItem
}

export function MarketDetailResources({ item }: MarketDetailResourcesProps) {
  const sourceLabel =
    item.origin === "iliad" ? `Download ${item.kind}` : "View source"
  const setupLabel = item.origin === "iliad" ? "Open Iliad" : "View setup"
  const setupHref =
    item.origin === "iliad"
      ? (item.links.docs ?? item.links.source)
      : (item.links.setup ?? item.links.docs ?? item.links.source)

  return (
    <div className="border-t border-border/30 bg-muted/10 px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
            Resources
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Review implementation and setup instructions before installing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href={item.links.source} external size="sm">
            {sourceLabel}
          </ActionLink>
          <ActionLink href={setupHref} external size="sm" variant="secondary">
            {setupLabel}
          </ActionLink>
        </div>
      </div>
    </div>
  )
}
