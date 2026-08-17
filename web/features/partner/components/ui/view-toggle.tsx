"use client"

import * as React from "react"
import { cn } from "@/lib/shared/utils"

export interface ViewToggleOption<T extends string> {
  value: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface ViewToggleProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ViewToggleOption<T>[]
  label?: string
  className?: string
}

export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  label = "View",
  className,
}: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-[var(--ironhub-line)] bg-muted/40 p-1",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9",
              isSelected
                ? "bg-card text-foreground shadow-[var(--ironhub-shadow)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
