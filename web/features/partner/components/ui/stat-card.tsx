"use client"

import * as React from "react"
import { cn } from "@/lib/shared/utils"

export interface StatRowProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

// The wide counts break to three across at `sm` rather than straight to five
// or six: at 640px a six-column row of tabular numbers is narrower than the
// numbers themselves.
const columnStyles: Record<NonNullable<StatRowProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 sm:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-3 lg:grid-cols-6",
}

export function StatRow({ children, columns = 4, className }: StatRowProps) {
  return (
    <div
      className={cn(
        "flex w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory gap-2.5 pb-1 sm:pb-0 sm:grid sm:gap-3",
        columnStyles[columns],
        className
      )}
    >
      {children}
    </div>
  )
}

export interface StatCardProps {
  label: string
  value: number | string
  tone?: "default" | "draft" | "published" | "primary"
  icon?: React.ComponentType<{ className?: string }>
  hint?: string
  selected?: boolean
  onSelect?: () => void
  className?: string
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  draft: "text-amber-700 dark:text-amber-400",
  published: "text-emerald-700 dark:text-emerald-400",
}

export function StatCard({
  label,
  value,
  tone = "default",
  icon: Icon,
  hint,
  selected,
  onSelect,
  className,
}: StatCardProps) {
  const content = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-xl sm:text-2xl font-semibold tabular-nums",
            toneStyles[tone]
          )}
        >
          {value}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">{label}</div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </div>
      {Icon && (
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </div>
  )

  const cardClasses = cn(
    "min-w-[125px] shrink-0 snap-start sm:min-w-0 sm:shrink rounded-xl border border-[var(--ironhub-line)] bg-card p-3 sm:p-4 shadow-[var(--ironhub-shadow)]",
    onSelect &&
      cn(
        "text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:w-full",
        selected && "border-primary/40 bg-primary/5 hover:bg-primary/10"
      ),
    className
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected ?? false}
        className={cardClasses}
      >
        {content}
      </button>
    )
  }

  return <div className={cardClasses}>{content}</div>
}
