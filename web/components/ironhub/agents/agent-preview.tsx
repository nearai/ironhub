"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  AgentModePreset,
  AgentStats,
  AppearanceConfig,
  SoulConfig,
} from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"
import {
  IconBrain,
  IconShieldCheck,
  IconSparkles,
  IconSword,
} from "@tabler/icons-react"

type AgentPreviewProps = {
  preset: AgentModePreset
  soul: SoulConfig
  appearance: AppearanceConfig
  stats: AgentStats
  skillsEnabled: number
  toolsConnected: number
}

export function AgentPreview({
  preset,
  soul,
  appearance,
  stats,
  skillsEnabled,
  toolsConnected,
}: AgentPreviewProps) {
  return (
    <Card className={cn("relative bg-card/90")}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">
            {soul.name} - {preset.label}
          </CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {soul.mission}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap gap-2">
          <Badge>Soul</Badge>
          <Badge variant="secondary">Ready</Badge>
          <Badge variant="outline">{preset.badge}</Badge>
        </div>
        <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
          <div className="relative mx-auto grid aspect-square w-full max-w-56 place-items-center rounded-2xl border bg-background/50">
            <div className="absolute inset-4 rounded-2xl border border-primary/30" />
            <div className="grid size-28 place-items-center rounded-full border bg-card shadow-2xl shadow-primary/20">
              <IconSword className="size-14 text-primary" />
            </div>
            <span className="absolute bottom-4 text-xs text-muted-foreground uppercase">
              {appearance.avatar}
            </span>
          </div>
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