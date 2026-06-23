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
      className="rounded-full border-primary/40 bg-transparent px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-widest text-primary uppercase"
    >
      {label}
      {item.origin === "iliad" ? " · Iliad" : ""}
    </Badge>
  )
}
