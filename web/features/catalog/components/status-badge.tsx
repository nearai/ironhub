import { IconSparkles, IconTool } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type StatusBadgeProps = {
  item: Pick<CatalogItem, "kind" | "status" | "origin">
}

export function StatusBadge({ item }: StatusBadgeProps) {
  const Icon = item.kind === "skill" ? IconSparkles : IconTool
  const iconClass = "size-3.5 -ml-0.5 mr-1"

  if (item.origin === "iliad") {
    return (
      <Badge variant="secondary">
        <Icon className={iconClass} aria-hidden="true" />
        {item.kind === "skill" ? "Skill" : "Tool"} · Iliad
      </Badge>
    )
  }

  return (
    <Badge variant={item.kind === "skill" ? "secondary" : "default"}>
      <Icon className={iconClass} aria-hidden="true" />
      {item.kind === "skill" ? "Skill" : "Tool"}
    </Badge>
  )
}
