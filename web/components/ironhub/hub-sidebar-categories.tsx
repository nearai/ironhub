"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type HubSidebarCategoriesProps = {
  categories: Array<{
    name: string
    count: number
  }>
}

export function HubSidebarCategories({
  categories,
}: HubSidebarCategoriesProps) {
  const activeCategory = useSearchParams().get("category")

  return (
    <div className="mt-3 grid gap-1">
      {categories.map((category) => {
        const isActive = activeCategory === category.name

        return (
          <Link
            key={category.name}
            href={`/marketplace?category=${encodeURIComponent(category.name)}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center justify-between rounded-4xl px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-foreground",
              isActive &&
                "bg-muted text-foreground ring-1 ring-border hover:bg-muted"
            )}
          >
            <span>{category.name}</span>
            <Badge variant="outline">{category.count}</Badge>
          </Link>
        )
      })}
    </div>
  )
}
