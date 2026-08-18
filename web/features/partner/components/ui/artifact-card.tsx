import * as React from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconCategory,
  IconFile,
  IconLock,
  IconSparkles,
  IconTool,
  IconWorld,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/shared/utils"
import type {
  ArtifactStatus,
  ArtifactType,
  ArtifactVisibility,
} from "@/features/partner/api/artifacts"
import { AttributeBadge } from "./attribute-badge"
import { RelativeTime } from "./relative-time"
import { StatusBadge } from "./status-badge"
import { workspaceLinkTone } from "./tone"

export interface ArtifactCardProps {
  type: ArtifactType
  title: string
  version: string
  status: ArtifactStatus
  description?: string | null
  visibility: ArtifactVisibility
  category?: string | null
  fileCount: number
  updatedAt: string | Date
  href?: string
  actionLabel?: string
  action?: React.ReactNode
  className?: string
}

function getFileCountLabel(count: number): string {
  if (count <= 0) return "No files"
  if (count === 1) return "1 file"
  return `${count} files`
}

export function ArtifactCard({
  type,
  title,
  version,
  status,
  description,
  visibility,
  category,
  fileCount,
  updatedAt,
  href,
  actionLabel = "Manage",
  action,
  className,
}: ArtifactCardProps) {
  const TypeIcon = type === "skill" ? IconSparkles : IconTool
  const typeWord = type === "skill" ? "Skill" : "Tool"

  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-0 border-[var(--ironhub-line)] p-5 transition-colors hover:border-primary/30",
        className
      )}
    >
      {/* 1. Identity row */}
      <div className="flex items-start gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <TypeIcon className="size-5" />
        </div>
        <h3
          className="min-w-0 flex-1 line-clamp-2 font-medium text-foreground break-words"
          title={title}
        >
          {title}
        </h3>
        <StatusBadge status={status} className="shrink-0" />
      </div>

      {/* 2. Meta line */}
      <div className="mt-2 text-xs text-muted-foreground">
        {typeWord} · v{version}
      </div>

      {/* 3. Description */}
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {description && description.trim().length > 0 ? (
          description
        ) : (
          <span className="italic text-muted-foreground">
            No description yet
          </span>
        )}
      </p>

      {/* 4. Footer */}
      <div className="mt-auto border-t border-[var(--ironhub-line)] pt-3">
        {/* Row 1: Attribute Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <AttributeBadge
            icon={visibility === "private" ? IconLock : IconWorld}
          >
            {visibility === "private" ? "Private" : "Public"}
          </AttributeBadge>

          <AttributeBadge icon={IconCategory} muted={!category}>
            {category || "Uncategorised"}
          </AttributeBadge>

          <AttributeBadge icon={IconFile}>
            {getFileCountLabel(fileCount)}
          </AttributeBadge>
        </div>

        {/* Row 2: Updated time + Action */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <RelativeTime
            prefix="Updated"
            value={updatedAt}
            className="min-w-0 truncate text-xs text-muted-foreground"
          />

          {action ? (
            <div>{action}</div>
          ) : href ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 rounded-lg hover:bg-primary/5 sm:h-8",
                workspaceLinkTone,
                "hover:text-near-cobalt dark:hover:text-primary"
              )}
            >
              <Link href={href}>
                <span>{actionLabel}</span>
                <IconArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
