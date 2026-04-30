import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog-types"

type StatusBadgeProps = {
  item: Pick<CatalogItem, "kind" | "status">
}

export function StatusBadge({ item }: StatusBadgeProps) {
  return (
    <Badge variant={item.kind === "skill" ? "secondary" : "default"}>
      {item.kind === "skill" ? "Skill" : "Tool"} · {item.status}
    </Badge>
  )
}
