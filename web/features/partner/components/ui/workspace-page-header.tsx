import * as React from "react"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/shared/utils"

export interface WorkspacePageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  action?: React.ReactNode
  backHref?: string
  backLabel?: string
  className?: string
  children?: React.ReactNode
}

export function WorkspacePageHeader({
  title,
  description,
  eyebrow,
  action,
  backHref,
  backLabel = "Back",
  className,
  children,
}: WorkspacePageHeaderProps) {
  return (
    <header className={cn("pb-6", className)}>
      {backHref && (
        <div className="mb-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 h-10 gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground sm:h-8"
          >
            <Link href={backHref}>
              <IconArrowLeft className="size-4" aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2 sm:self-start">
            {action}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  )
}
