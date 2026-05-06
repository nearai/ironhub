"use client"

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
      className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:bg-card hover:shadow-[0_20px_50px_rgba(43,130,212,0.15)]"
      size="sm"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <CatalogIcon item={item} />
          <CardTitle className="text-lg font-bold">
            <Link
              href={`/marketplace/${item.slug}`}
              className="hover:text-primary transition-colors"
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
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {item.valueProp ?? item.description}
        </p>
        {!compact && (
          <div className="flex flex-wrap gap-2">
            {(item.valueTags?.length ? item.valueTags : item.tags).slice(0, 4).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline"
                className="rounded-full bg-primary/5 border-primary/10 text-[0.7rem] font-medium text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-4 border-t border-border/40 pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
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
          asChild 
          variant="outline"
          className="w-full gap-2 rounded-full border-border/60 bg-transparent font-semibold text-foreground transition-all hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
        >
          <Link href={`/marketplace/${item.slug}`}>
            View setup
            <IconArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
