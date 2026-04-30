"use client"

import { PersonaCard } from "@/components/ironhub/agents/persona-card"
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
  function handlePersonaSelect(nextMode: AgentMode) {
    onModeChange(nextMode)
    onContinue()
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {presets.map((preset) => (
          <PersonaCard
            key={preset.mode}
            preset={preset}
            selected={mode === preset.mode}
            onSelect={handlePersonaSelect}
          />
        ))}
      </div>
    </section>
  )
}
