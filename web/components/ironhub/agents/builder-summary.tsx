"use client"

import { PersonaPortrait } from "@/components/ironhub/agents/persona-portrait"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type {
  AgentModePreset,
  AgentStats,
  SoulConfig,
} from "@/lib/agent-builder-types"
import { statRows } from "@/lib/agent-builder-utils"

type BuilderSummaryProps = {
  preset: AgentModePreset
  soul: SoulConfig
  stats: AgentStats
}

export function BuilderSummary({ preset, soul, stats }: BuilderSummaryProps) {
  const ready = soul.name.trim() && soul.mission.trim()

  return (
    <aside className="grid gap-4 rounded-xl border bg-card/80 p-4 lg:sticky lg:top-24">
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{soul.name}</p>
            <p className="text-sm text-muted-foreground">{preset.label}</p>
          </div>
          <Badge variant={ready ? "default" : "outline"}>
            {ready ? "Ready" : "Draft"}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {soul.mission}
        </p>
        <PersonaPortrait
          preset={preset}
          className="aspect-[4/3] w-full"
          imageClassName="object-center scale-90"
          sizes="320px"
        />
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
    </aside>
  )
}
