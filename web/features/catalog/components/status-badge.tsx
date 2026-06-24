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
      className="rounded-full border border-primary/45 bg-primary/10 px-[11px] py-[5px] font-mono text-[0.66rem] font-medium tracking-[0.12em] text-[#0072c9] uppercase dark:text-[#83dcff]"
    >
      {label}
      {item.origin === "iliad" ? " · Iliad" : ""}
    </Badge>
  )
}
