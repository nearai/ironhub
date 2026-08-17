import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/shared/utils"
import type { ArtifactStatus } from "@/features/partner/api/artifacts"

export interface StatusBadgeProps {
  status: ArtifactStatus
  className?: string
}

const statusConfig: Record<
  ArtifactStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  published: {
    label: "Published",
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-full px-2.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}
