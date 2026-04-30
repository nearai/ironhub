"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { SummaryNumber } from "@/components/ironhub/agents/summary-number"
import type {
  AgentModePreset,
  AgentStats,
  SoulConfig,
} from "@/lib/agent-builder-types"
import { statRows } from "@/lib/agent-builder-utils"
import { IconShieldCheck, IconSparkles } from "@tabler/icons-react"

type BuilderSummaryProps = {
  preset: AgentModePreset
  soul: SoulConfig
  stats: AgentStats
  skillsEnabled: number
  toolsConnected: number
  onReview: () => void
}

export function BuilderSummary({
  preset,
  soul,
  stats,
  skillsEnabled,
  toolsConnected,
  onReview,
}: BuilderSummaryProps) {
  const ready = soul.name.trim() && soul.mission.trim()

  return (
    <aside className="grid gap-4 rounded-2xl border bg-card/80 p-4 lg:sticky lg:top-6">
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border bg-primary/10 text-primary">
            <IconSparkles />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{soul.name}</p>
            <p className="text-sm text-muted-foreground">{preset.label}</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {soul.mission}
        </p>
      </div>
      <div className="grid gap-3 rounded-xl border bg-background/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Builder status</span>
          <span className="flex items-center gap-1 text-sm text-primary">
            <IconShieldCheck className="size-4" />
            {ready ? "Ready" : "Draft"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <SummaryNumber label="Skills" value={skillsEnabled} />
          <SummaryNumber label="Tools" value={toolsConnected} />
        </div>
      </div>
      <div className="grid gap-3">
        {statRows(stats).map((row) => (
          <div key={row.label} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>{row.label}</span>
              <span className="font-medium text-primary">{row.value}</span>
            </div>
            <Progress value={row.value} />
          </div>
        ))}
      </div>
      <Button type="button" onClick={onReview}>
        Review and export
      </Button>
    </aside>
  )
}
