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
import type { CollectionBundle } from "@/lib/catalog/collections"

type CollectionBundleCardProps = {
  bundle: CollectionBundle
  compact?: boolean
}

export function CollectionBundleCard({
  bundle,
  compact = false,
}: CollectionBundleCardProps) {
  const previewItems = bundle.items.slice(0, compact ? 4 : 5)

  return (
    <Card
      id={bundle.slug}
      className="group relative flex h-full flex-col overflow-hidden border-border bg-card transition-colors duration-200 hover:border-primary/40"
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
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {bundle.summary}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
          {[
            { value: bundle.items.length, label: "Included", accent: true },
            { value: bundle.toolCount, label: "Tools", accent: false },
            { value: bundle.skillCount, label: "Skills", accent: false },
          ].map((stat) => (
            <div key={stat.label} className="px-2 py-[18px] text-center">
              <div
                className={`text-[1.7rem] leading-none font-black ${
                  stat.accent ? "text-primary" : "text-foreground"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-1.5 font-mono text-[0.62rem] tracking-[0.12em] text-muted-foreground uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {!compact && (
          <p className="text-sm leading-relaxed text-muted-foreground italic opacity-90">
            &quot;{bundle.outcome}&quot;
          </p>
        )}

        <div className="flex flex-wrap gap-[7px]">
          {previewItems.map((item) => (
            <Badge
              key={item.slug}
              variant="outline"
              className="rounded-[4px] border-border bg-transparent px-[9px] py-[4px] font-mono text-[0.66rem] font-normal tracking-[0.04em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              {item.name}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="mt-auto border-t border-border/40 pt-4">
        <Button
          asChild
          variant="outline"
          className="h-11 w-full gap-2 text-[0.94rem] font-medium"
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
