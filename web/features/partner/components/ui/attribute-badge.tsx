import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/shared/utils"

export interface AttributeBadgeProps {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  muted?: boolean
  title?: string
  className?: string
}

export function AttributeBadge({
  icon: Icon,
  children,
  muted = false,
  title,
  className,
}: AttributeBadgeProps) {
  const resolvedTitle =
    title ?? (typeof children === "string" ? children : undefined)

  return (
    <Badge
      variant="outline"
      title={resolvedTitle}
      className={cn(
        "h-6 min-w-0 gap-1.5 rounded-full border-[var(--ironhub-line)] bg-muted/40 px-2.5 text-xs font-normal text-muted-foreground",
        muted && "italic",
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      <span className="block max-w-[12rem] truncate">{children}</span>
    </Badge>
  )
}
