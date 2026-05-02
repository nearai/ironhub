"use client"

import { PersonaPortrait } from "@/components/ironhub/agents/persona-portrait"
import type { AgentMode, AgentModePreset } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"

type AgentSelectorCardProps = {
  preset: AgentModePreset
  selected: boolean
  onSelect: (mode: AgentMode) => void
}

export function AgentSelectorCard({
  preset,
  selected,
  onSelect,
}: AgentSelectorCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(preset.mode)}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-xl bg-card text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card/95 hover:shadow-xl hover:shadow-primary/5",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "shadow-xl ring-4 shadow-primary/10 ring-primary/15"
          : "border"
      )}
    >
      <PersonaPortrait
        preset={preset}
        priority={preset.mode === "research-agent"}
        className="absolute inset-0 rounded-none border-0 bg-background/50"
        imageClassName="object-center scale-[0.9] transition-transform duration-300 group-hover:scale-95"
        sizes="(min-width: 1280px) 150px, (min-width: 768px) 28vw, 42vw"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent px-3 pt-6 pb-2 text-center transition-opacity duration-300 group-hover:from-background">
        <span className="text-[10px] font-bold tracking-wider text-foreground/70 uppercase transition-colors group-hover:text-foreground">
          {preset.label}
        </span>
      </div>
    </button>
  )
}
