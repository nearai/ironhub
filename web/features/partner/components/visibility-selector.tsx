"use client"

import { IconLock, IconWorld } from "@tabler/icons-react"

import { cn } from "@/lib/shared/utils"

const OPTIONS = [
  {
    value: "private" as const,
    icon: IconLock,
    title: "Only my organization",
    description: "Nobody outside your organization can see or install it.",
  },
  {
    value: "public" as const,
    icon: IconWorld,
    title: "Request public listing",
    description:
      "Stays private to your org until an IronHub reviewer approves the listing.",
  },
]

/**
 * Visibility control shared by the create form and both edit forms. The public
 * option is a *request*, not a live listing, so keep that wording identical
 * everywhere it appears.
 *
 * The options stack below `sm`: side by side at 375px each card was nine lines of
 * one-to-three words. Consumers supply their own section heading, so this control
 * renders no label of its own.
 */
export function VisibilitySelector({
  visibility,
  onChange,
}: {
  visibility: "public" | "private"
  onChange: (value: "public" | "private") => void
}) {
  return (
    <div
      role="group"
      aria-label="Who can see this"
      className="grid gap-3 sm:grid-cols-2"
    >
      {OPTIONS.map((option) => {
        const selected = visibility === option.value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5"
                : "border-[var(--ironhub-line)] bg-background/30 hover:bg-muted/30"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {option.title}
              </span>
              <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                {option.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
