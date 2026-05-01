"use client"

import { PersonaPortrait } from "@/components/ironhub/agents/persona-portrait"
import { Button } from "@/components/ui/button"
import type {
  AgentModePreset,
  AgentStats,
  SoulConfig,
} from "@/lib/agent-builder-types"
import {
  selectorMetricTiles,
  selectorStatRows,
} from "@/lib/agent-selector-utils"

type AgentSelectorPreviewProps = {
  preset: AgentModePreset | null
  soul: SoulConfig
  stats: AgentStats
  skillsEnabled: number
  toolsConnected: number
  onContinue: () => void
}

export function AgentSelectorPreview({
  preset,
  soul,
  stats,
  skillsEnabled,
  toolsConnected,
  onContinue,
}: AgentSelectorPreviewProps) {
  if (!preset) {
    return (
      <aside className="grid min-h-[460px] rounded-2xl border bg-card/80 p-6 shadow-sm">
        <div className="grid place-items-center text-center">
          <h2 className="max-w-xs text-4xl leading-tight font-bold text-muted-foreground/55 md:text-5xl">
            Choose your IronClaw Agent
          </h2>
        </div>
        <Button
          type="button"
          disabled
          className="mt-auto h-12 rounded-xl text-base tracking-wide uppercase"
        >
          Select
        </Button>
      </aside>
    )
  }

  return (
    <aside className="grid min-h-[460px] rounded-2xl border bg-card/90 p-6 shadow-sm">
      <div className="grid gap-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {soul.name}
          </h2>
          <p className="text-xs font-bold tracking-widest text-primary/80 uppercase">
            {soul.title}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {soul.mission}
          </p>
        </div>
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_150px]">
          <PersonaPortrait
            preset={preset}
            className="aspect-square w-full rounded-xl"
            imageClassName="object-center scale-105"
            sizes="260px"
          />
          <div className="grid gap-3">
            {selectorMetricTiles({ skillsEnabled, toolsConnected, soul }).map(
              (metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border bg-background/45 p-3"
                >
                  <div className="text-base font-semibold">{metric.value}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {metric.label}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
        <div className="grid gap-3">
          {selectorStatRows(stats).map((metric) => (
            <div key={metric.label} className="grid gap-1">
              <div className="flex items-center justify-between text-xs">
                <span>{metric.label}</span>
                <span className="font-semibold text-primary">
                  {metric.value}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button
        type="button"
        onClick={onContinue}
        className="mt-8 h-12 rounded-xl text-base tracking-wide uppercase"
      >
        Select
      </Button>
    </aside>
  )
}
