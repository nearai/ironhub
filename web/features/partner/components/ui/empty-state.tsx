import * as React from "react"
import { cn } from "@/lib/shared/utils"

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[var(--ironhub-line)] bg-muted/20 px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-5">
          <Icon aria-hidden="true" />
        </div>
      )}
      <h3 className={cn("text-base font-medium text-foreground", Icon && "mt-4")}>
        {title}
      </h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
