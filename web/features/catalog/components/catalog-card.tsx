"use client"

import Link from "next/link"
import { IconArrowRight, IconKey, IconUserCircle } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/shared/utils"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog/types"
import { formatBytes } from "@/lib/shared/format-utils"
import { CatalogIcon } from "./catalog-icon"
import { StatusBadge } from "./status-badge"

type CatalogCardProps = {
  item: CatalogItem
  compact?: boolean
  onSelect?: (item: CatalogItem) => void
  selectText?: string
  disabled?: boolean
  isSelected?: boolean
}

export function CatalogCard({
  item,
  compact = false,
  onSelect,
  selectText,
  disabled = false,
  isSelected = false,
}: CatalogCardProps) {
  const metric =
    item.origin === "iliad"
      ? formatBytes(item.contentSize)
      : item.kind === "tool"
        ? `${item.actionCount} actions`
        : `${item.activationKeywords.length} triggers`

  return (
    <Card
      className="group relative flex h-full flex-col overflow-hidden border-border bg-card transition-colors duration-200 hover:border-primary/40"
      size="sm"
    >
      <CardHeader className="pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <CatalogIcon item={item} />
          <CardTitle className="min-w-0 text-[0.95rem] leading-snug font-bold">
            <Link
              href={`/marketplace/${item.slug}`}
              className="line-clamp-2 transition-colors hover:text-primary"
            >
              {item.name}
            </Link>
          </CardTitle>
        </div>
        <CardAction className="self-start">
          <StatusBadge item={item} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {item.description ?? "No description."}
        </p>
        {!compact && (
          <div className="flex flex-wrap gap-[7px]">
            {(item.valueTags?.length ? item.valueTags : item.tags)
              .slice(0, 4)
              .map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="rounded-[4px] border-border bg-transparent px-[9px] py-[4px] font-mono text-[0.66rem] font-normal tracking-[0.04em] text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t border-border/40 pt-4">
        {onSelect ? (
          <>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 opacity-80">
                <IconUserCircle className="size-3.5" />
                {item.author}
              </span>
              <span className="inline-flex items-center gap-1.5 opacity-80">
                <IconKey className="size-3.5" />
                {metric}
              </span>
            </div>
            <Button
              onClick={() => !disabled && onSelect(item)}
              disabled={disabled}
              variant="outline"
              className={cn(
                "w-full cursor-pointer gap-2 font-semibold transition-all",
                disabled
                  ? "cursor-not-allowed border border-border/40 bg-muted text-muted-foreground opacity-70"
                  : isSelected
                    ? "border-primary bg-primary/10 text-[#0072c9] hover:bg-primary/20 hover:text-[#0072c9]"
                    : "border-primary bg-transparent text-foreground hover:bg-primary/5 hover:text-primary"
              )}
            >
              {selectText || "Select"}
              <IconArrowRight className={cn("size-4", isSelected && "hidden")} />
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 font-mono text-[0.74rem]">
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
              <span className="truncate">{item.author}</span>
              <span aria-hidden="true" className="opacity-60">
                ·
              </span>
              <span className="whitespace-nowrap">{metric}</span>
            </span>
            <Link
              href={`/marketplace/${item.slug}`}
              className="inline-flex shrink-0 items-center gap-1 text-primary transition-colors hover:text-primary/80"
            >
              View setup
              <IconArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
