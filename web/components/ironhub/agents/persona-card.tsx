"use client"

import { PersonaPortrait } from "@/components/ironhub/agents/persona-portrait"
import type { AgentMode, AgentModePreset } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"
import { IconArrowRight } from "@tabler/icons-react"

type PersonaCardProps = {
  preset: AgentModePreset
  selected: boolean
  onSelect: (mode: AgentMode) => void
}

export function PersonaCard({ preset, selected, onSelect }: PersonaCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(preset.mode)}
      className={cn(
        "group grid min-h-[360px] overflow-hidden rounded-xl border bg-card/80 text-left transition",
        "hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary shadow-2xl shadow-primary/10"
          : "border-border"
      )}
    >
      <PersonaPortrait
        preset={preset}
        priority={preset.mode === "developer-agent"}
        className="h-48 rounded-none border-0 border-b bg-muted/20"
        imageClassName="scale-110 transition-transform duration-300 group-hover:scale-[1.15]"
      />
      <span className="grid gap-4 p-4">
        <span className="grid gap-2">
          <span className="text-lg font-semibold">{preset.label}</span>
          <span className="min-h-12 text-sm leading-6 text-muted-foreground">
            {preset.description}
          </span>
        </span>
        <span className="mt-auto flex items-center justify-between rounded-lg border bg-background/45 px-3 py-2 text-sm font-medium">
          {selected ? "Selected persona" : "Select persona"}
          <IconArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  )
}
