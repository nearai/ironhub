"use client"

import Link from "next/link"
import { IconArrowRight, IconBoxMultiple } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CollectionBundle } from "@/lib/collection-bundles"

type CollectionBundleCardProps = {
  bundle: CollectionBundle
  compact?: boolean
}

export function CollectionBundleCard({
  bundle,
  compact = false,
}: CollectionBundleCardProps) {
  const previewItems = bundle.items.slice(0, compact ? 4 : 8)

  return (
    <Card
      id={bundle.slug}
      className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:bg-card hover:shadow-[0_20px_50px_rgba(43,130,212,0.15)]"
      size="sm"
    >
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <IconBoxMultiple className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl font-bold text-foreground">
              {bundle.title}
            </CardTitle>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {bundle.summary}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-center shadow-sm transition-colors group-hover:border-primary/20 group-hover:bg-background">
            <div className="text-xl font-bold text-primary">
              {bundle.items.length}
            </div>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
              Included
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-center shadow-sm transition-colors group-hover:border-primary/20 group-hover:bg-background">
            <div className="text-xl font-bold text-primary">
              {bundle.toolCount}
            </div>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
              Tools
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-center shadow-sm transition-colors group-hover:border-primary/20 group-hover:bg-background">
            <div className="text-xl font-bold text-primary">
              {bundle.skillCount}
            </div>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
              Skills
            </div>
          </div>
        </div>

        {!compact && (
          <p className="text-sm leading-relaxed text-muted-foreground italic opacity-90">
            &quot;{bundle.outcome}&quot;
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {previewItems.map((item) => (
            <Badge 
              key={item.slug} 
              variant="outline"
              className="rounded-full border-border/60 bg-transparent px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
            >
              {item.name}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="mt-auto border-t border-border/40 pt-4">
        <Button 
          asChild
          className="w-fit gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
        >
          <Link href={`/collections/${bundle.slug}`}>
            Open Collection
            <IconArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
