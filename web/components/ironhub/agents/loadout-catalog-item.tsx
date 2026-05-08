"use client"

import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import type { CatalogItem } from "@/lib/catalog-types"

type LoadoutCatalogItemProps = {
  item: CatalogItem
  checked: boolean
  onToggle: (slug: string) => void
}

export function LoadoutCatalogItem({
  item,
  checked,
  onToggle,
}: LoadoutCatalogItemProps) {
  return (
    <label className="flex items-start gap-3 rounded-xl border bg-background/40 p-3">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <Badge variant={item.kind === "tool" ? "default" : "secondary"}>
            {item.kind}
          </Badge>
        </span>
        <span className="mt-1 line-clamp-2 block text-sm leading-5 text-muted-foreground">
          {item.description ?? "No description."}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={() => onToggle(item.slug)} />
    </label>
  )
}
