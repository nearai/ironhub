"use client"

import { PersonaCard } from "@/components/ironhub/agents/persona-card"
import { SelectedPersonaSummary } from "@/components/ironhub/agents/selected-persona-summary"
import type { AgentMode, AgentModePreset } from "@/lib/agent-builder-types"

type ModeSelectorProps = {
  mode: AgentMode
  presets: AgentModePreset[]
  onModeChange: (mode: AgentMode) => void
  onContinue: () => void
}

export function ModeSelector({
  mode,
  presets,
  onModeChange,
  onContinue,
}: ModeSelectorProps) {
  const selectedPreset = presets.find((preset) => preset.mode === mode)

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {presets.map((preset) => (
          <PersonaCard
            key={preset.mode}
            preset={preset}
            selected={mode === preset.mode}
            onSelect={onModeChange}
          />
        ))}
      </div>
      {selectedPreset ? (
        <SelectedPersonaSummary
          preset={selectedPreset}
          onContinue={onContinue}
        />
      ) : null}
    </section>
  )
}
