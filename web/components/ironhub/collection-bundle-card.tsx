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
      className="h-full bg-card/80 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_20px_70px_rgb(43_130_212_/_0.18)]"
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <IconBoxMultiple className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-xl">{bundle.title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {bundle.summary}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--ironhub-line)] bg-background/55 p-3">
            <div className="text-lg font-semibold text-primary">
              {bundle.items.length}
            </div>
            <div className="text-xs text-muted-foreground">Included</div>
          </div>
          <div className="rounded-lg border border-[var(--ironhub-line)] bg-background/55 p-3">
            <div className="text-lg font-semibold text-primary">
              {bundle.toolCount}
            </div>
            <div className="text-xs text-muted-foreground">Tools</div>
          </div>
          <div className="rounded-lg border border-[var(--ironhub-line)] bg-background/55 p-3">
            <div className="text-lg font-semibold text-primary">
              {bundle.skillCount}
            </div>
            <div className="text-xs text-muted-foreground">Skills</div>
          </div>
        </div>
        {!compact && (
          <p className="text-sm leading-6 text-muted-foreground">
            {bundle.outcome}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {previewItems.map((item) => (
            <Badge key={item.slug} variant="outline">
              {item.name}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-3 border-t">
        <Button asChild>
          <Link href={`/collections/${bundle.slug}`}>
            Open Collection
            <IconArrowRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
