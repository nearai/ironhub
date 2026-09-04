"use client"

import { IconFilter } from "@tabler/icons-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/shared/utils"

export interface FilterMenuProps {
  /** How many filters are set to something other than "everything". */
  activeCount: number
  /** Rendered as a "Clear filters" action when any filter is active. */
  onClear?: () => void
  /** The filter controls, stacked inside the panel. */
  children: React.ReactNode
  className?: string
}

/**
 * A single control that stands in for a row of filter selects.
 *
 * Four selects side by side do not fit the workspace's content width without
 * squeezing the search field down to a stub, and they take the eye's attention
 * every time whether or not anything is filtered. Collapsed behind one button,
 * the count carries the only thing worth seeing at a glance — that a filter is
 * on — and the search field gets the room.
 */
export function FilterMenu({
  activeCount,
  onClear,
  children,
  className,
}: FilterMenuProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className="h-10 w-full rounded-lg sm:w-auto"
      >
        <IconFilter className="size-4" aria-hidden="true" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border border-[var(--ironhub-line)] bg-popover p-3 shadow-lg">
          {children}
          {activeCount > 0 && onClear && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
              className="h-10 w-full rounded-lg"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
