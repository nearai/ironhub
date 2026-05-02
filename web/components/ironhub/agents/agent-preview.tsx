"use client"

import { PersonaPortrait } from "@/components/ironhub/agents/persona-portrait"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  AgentModePreset,
  AgentStats,
  SoulConfig,
} from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"
import { IconBrain, IconShieldCheck, IconSparkles } from "@tabler/icons-react"

type AgentPreviewProps = {
  preset: AgentModePreset
  soul: SoulConfig
  stats: AgentStats
  skillsEnabled: number
  toolsConnected: number
}

export function AgentPreview({
  preset,
  soul,
  stats,
  skillsEnabled,
  toolsConnected,
}: AgentPreviewProps) {
  return (
    <Card className={cn("relative bg-card/90")}>
      <CardHeader>
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {soul.name}
          </CardTitle>
          <p className="text-xs font-bold tracking-widest text-primary/80 uppercase">
            {soul.title}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {soul.mission}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
          <PersonaPortrait
            preset={preset}
            className="mx-auto aspect-square w-full max-w-56"
            imageClassName="object-center scale-95"
            sizes="220px"
          />
          <div className="grid gap-4">
            {previewBars(stats).map((metric) => (
              <div key={metric.label} className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{metric.label}</span>
                  <span className="font-medium text-primary">
                    {metric.value}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryMetrics(skillsEnabled, toolsConnected, soul).map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border bg-background/45 p-3"
            >
              <metric.icon className="mb-3 size-5 text-primary" />
              <div className="text-2xl font-semibold">{metric.value}</div>
              <div className="text-xs text-muted-foreground">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function previewBars(stats: AgentStats) {
  return [
    { label: "Autonomy", value: stats.autonomy },
    { label: "Security", value: stats.security },
    { label: "Memory", value: stats.memory },
    { label: "Tool Power", value: stats.toolPower },
    { label: "Chain Access", value: stats.chainAccess },
  ]
}

function summaryMetrics(
  skillsEnabled: number,
  toolsConnected: number,
  soul: SoulConfig
) {
  return [
    { label: "Skills enabled", value: skillsEnabled, icon: IconBrain },
    { label: "Tools connected", value: toolsConnected, icon: IconSparkles },
    {
      label: "Soul status",
      value: soul.name.trim() && soul.mission.trim() ? "Ready" : "Draft",
      icon: IconShieldCheck,
    },
  ]
}
