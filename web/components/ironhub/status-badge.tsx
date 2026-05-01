import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog-types"

type StatusBadgeProps = {
  item: Pick<CatalogItem, "kind" | "status" | "origin">
}

export function StatusBadge({ item }: StatusBadgeProps) {
  if (item.origin === "iliad") {
    return (
      <Badge variant="secondary">
        {item.kind === "skill" ? "Skill" : "Tool"} · Iliad
      </Badge>
    )
  }

  return (
    <Badge variant={item.kind === "skill" ? "secondary" : "default"}>
      {item.kind === "skill" ? "Skill" : "Tool"} · {item.status}
    </Badge>
  )
}
