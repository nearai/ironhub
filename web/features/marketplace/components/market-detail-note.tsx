import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailNoteProps = {
  item: CatalogItem
}

export function MarketDetailNote({ item }: MarketDetailNoteProps) {
  return (
    <div className="border-t border-border/30 bg-muted/5 px-6 py-4">
      <p className="text-[10px] leading-relaxed text-muted-foreground italic">
        {getDetailNote(item)}
      </p>
    </div>
  )
}

function getDetailNote(item: CatalogItem) {
  if (item.origin === "iliad") {
    return `Public ${item.kind} mirrored from Iliad publisher ${
      item.remoteUserId ?? "unknown"
    }.`
  }
  if (item.kind === "skill")
    return `Skill branch derived from trunk ${item.trunk}.`
  if (item.related.branches?.length) {
    return `Tool trunk with active branches: ${item.related.branches.join(", ")}.`
  }
  return "Standalone tool trunk without current skill branches."
}
