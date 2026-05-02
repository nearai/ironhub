import { IconKey, IconShieldCheck, IconUserCircle } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"

type CollectionEntryListProps = {
  items: CatalogItem[]
}

export function CollectionEntryList({ items }: CollectionEntryListProps) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <Card key={item.slug} size="sm" className="bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base">{item.name}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.kind === "tool" ? "WASM tool" : "Prompt skill"} ·{" "}
                  {item.category}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <span className="inline-flex items-center gap-1.5">
                <IconUserCircle className="size-3.5" />
                {item.author}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconKey className="size-3.5" />
                {getItemMetric(item)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconShieldCheck className="size-3.5" />
                {item.auth.requiredSecrets.length
                  ? `${item.auth.requiredSecrets.length} secrets`
                  : "No required secrets"}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function getItemMetric(item: CatalogItem) {
  if (item.kind === "tool") {
    return `${item.actionCount} actions`
  }

  return `${item.activationKeywords.length} triggers`
}
