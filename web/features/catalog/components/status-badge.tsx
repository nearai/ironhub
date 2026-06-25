import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type StatusBadgeProps = {
  item: Pick<CatalogItem, "kind" | "status" | "origin">
}

export function StatusBadge({ item }: StatusBadgeProps) {
  const label = item.kind === "skill" ? "Skill" : "Tool"

  return (
    <Badge
      variant="outline"
      className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-[2px] font-mono text-[0.58rem] font-medium tracking-[0.06em] whitespace-nowrap text-[#0072c9] uppercase dark:text-[#83dcff]"
    >
      {label}
      {item.origin === "iliad" ? " · Iliad" : ""}
    </Badge>
  )
}
