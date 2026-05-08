import { ActionLink } from "@/components/ironhub/action-link"
import { CatalogIcon } from "@/components/ironhub/catalog-icon"
import { StatusBadge } from "@/components/ironhub/status-badge"
import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog-types"

type MarketDetailHeaderProps = {
  item: CatalogItem
}

export function MarketDetailHeader({ item }: MarketDetailHeaderProps) {
  const sourceLabel =
    item.origin === "iliad" ? `Download ${item.kind}` : "View source"
  const setupLabel = item.origin === "iliad" ? "Open Iliad" : "View setup"
  const setupHref =
    item.origin === "iliad"
      ? (item.links.docs ?? item.links.source)
      : (item.links.setup ?? item.links.docs ?? item.links.source)

  return (
    <div className="flex flex-col w-full min-w-0 gap-6 rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-[var(--ironhub-shadow)] backdrop-blur-xl sm:p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col w-full min-w-0 gap-4 sm:flex-row">
        <CatalogIcon item={item} />
        <div className="w-full min-w-0 flex-1">
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {item.name}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
            <StatusBadge item={item} />
            {item.author && (
              <>
                <span className="text-muted-foreground/45 select-none" aria-hidden="true">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span>By</span>
                  <span className="font-semibold text-foreground/90">{item.author}</span>
                </span>
              </>
            )}
            {item.version && (
              <>
                <span className="text-muted-foreground/45 select-none" aria-hidden="true">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span>Version</span>
                  <span className="font-mono font-semibold text-foreground/90">{item.version}</span>
                </span>
              </>
            )}
          </div>
          <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {item.description ?? "No description."}
          </p>
          {item.valueTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.valueTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0 sm:self-start">
        <ActionLink href={item.links.source} external>
          {sourceLabel}
        </ActionLink>
        <ActionLink href={setupHref} external variant="default">
          {setupLabel}
        </ActionLink>
      </div>
    </div>
  )
}

