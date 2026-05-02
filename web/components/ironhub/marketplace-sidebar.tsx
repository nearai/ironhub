"use client"

import type { ComponentType } from "react"
import {
  IconAdjustments,
  IconBolt,
  IconBrain,
  IconCategory,
  IconDatabase,
  IconHexagon,
  IconLayoutGrid,
  IconMessage2,
  IconShield,
  IconTerminal2,
} from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

export type MarketplaceSidebarCategory = {
  slug: string
  count: number
}

type MarketplaceSidebarProps = {
  categories: MarketplaceSidebarCategory[]
  totalCount: number
  onSelect?: () => void
  hideTitle?: boolean
}

type CategoryIcon = ComponentType<{ className?: string }>

export function MarketplaceSidebar({
  categories,
  totalCount,
  onSelect,
  hideTitle,
}: MarketplaceSidebarProps) {
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

  const entries: MarketplaceSidebarCategory[] = [
    { slug: "all", count: totalCount },
    ...categories,
  ]

  const categoryIcons: Record<string, CategoryIcon> = {
    all: IconLayoutGrid,
    "dev tools": IconTerminal2,
    "data & apis": IconDatabase,
    security: IconShield,
    automation: IconAdjustments,
    communication: IconMessage2,
    productivity: IconBolt,
    "ai & ml": IconBrain,
    web3: IconHexagon,
  }

  return (
    <nav aria-label="Categories" className="flex flex-col gap-1">
      {!hideTitle && (
        <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ih-ink-soft)]">
          Categories
        </h3>
      )}
      {entries.map((entry) => {
        const isActive = entry.slug === active
        const label = entry.slug === "all" ? "All" : entry.slug
        const Icon = categoryIcons[entry.slug.toLowerCase()] || IconCategory

        return (
          <button
            key={entry.slug}
            type="button"
            onClick={() => selectCategory(entry.slug)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-[var(--ih-accent)]/10 text-[var(--ih-accent)] font-semibold"
                : "text-[var(--ih-ink-soft)] hover:bg-[var(--ih-surface-muted)] hover:text-[var(--ih-ink)]",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Icon className="size-4 shrink-0 opacity-70" />
              <span>{label}</span>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                isActive
                  ? "bg-[var(--ih-accent)]/15 text-[var(--ih-accent)]"
                  : "bg-[var(--ih-line)]/10 text-[var(--ih-ink-soft)]",
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
