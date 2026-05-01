"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

export type HomeSidebarCategory = {
  slug: string
  count: number
}

type HomeSidebarProps = {
  categories: HomeSidebarCategory[]
  totalCount: number
  onSelect?: () => void
}

export function HomeSidebar({
  categories,
  totalCount,
  onSelect,
}: HomeSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get("category") ?? "all"

  function selectCategory(slug: string) {
    const params = new URLSearchParams(searchParams)
    if (slug === "all") {
      params.delete("category")
    } else {
      params.set("category", slug)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    onSelect?.()
  }

  const entries: HomeSidebarCategory[] = [
    { slug: "all", count: totalCount },
    ...categories,
  ]

  return (
    <nav aria-label="Categories" className="flex flex-col gap-1">
      <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Categories
      </h3>
      {entries.map((entry) => {
        const isActive = entry.slug === active
        const label = entry.slug === "all" ? "All" : entry.slug
        return (
          <button
            key={entry.slug}
            type="button"
            onClick={() => selectCategory(entry.slug)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span className="truncate capitalize">{label}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {entry.count}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
