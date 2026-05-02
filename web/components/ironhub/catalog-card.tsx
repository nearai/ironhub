import Link from "next/link"
import { IconArrowRight, IconKey, IconUserCircle } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"
import { formatBytes } from "@/lib/format-utils"
import { CatalogIcon } from "./catalog-icon"
import { StatusBadge } from "./status-badge"

type CatalogCardProps = {
  item: CatalogItem
  compact?: boolean
}

export function CatalogCard({ item, compact = false }: CatalogCardProps) {
  const metric =
    item.origin === "iliad"
      ? formatBytes(item.contentSize)
      : item.kind === "tool"
      ? `${item.actionCount} actions`
      : `${item.activationKeywords.length} triggers`

  return (
    <Card
      className="group h-full border-[var(--ih-border-ui)] bg-[var(--ih-surface-muted)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[var(--ih-border-ui-hover)] hover:bg-[var(--ih-surface)] hover:shadow-[var(--ih-shadow)]"
      size="sm"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <CatalogIcon item={item} />
          <CardTitle>
            <Link
              href={`/marketplace/${item.slug}`}
              className="text-[var(--ih-ink)] transition-colors group-hover:text-[var(--ih-accent)]"
            >
              {item.name}
            </Link>
          </CardTitle>
        </div>
        <CardAction>
          <StatusBadge item={item} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>
        {!compact && (
          <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <IconUserCircle className="size-3.5" />
            {item.author}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconKey className="size-3.5" />
            {metric}
          </span>
        </div>
          <Button asChild variant="outline">
            <Link href={`/marketplace/${item.slug}`}>
              View setup
            <IconArrowRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
