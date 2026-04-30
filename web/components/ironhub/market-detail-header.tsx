import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogIcon } from "@/components/ironhub/catalog-icon"
import { StatusBadge } from "@/components/ironhub/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"

type MarketDetailHeaderProps = {
  item: CatalogItem
}

export function MarketDetailHeader({ item }: MarketDetailHeaderProps) {
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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href={item.links.source} external>
            Open source
          </ActionLink>
          <ActionLink
            href={item.links.setup ?? item.links.docs ?? item.links.source}
            external
            variant="default"
          >
            View setup
          </ActionLink>
        </div>
      </CardContent>
    </Card>
  )
}
