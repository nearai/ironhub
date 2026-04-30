"use client"

import { AgentSelectorCard } from "@/components/ironhub/agents/agent-selector-card"
import { AgentSelectorPreview } from "@/components/ironhub/agents/agent-selector-preview"
import { agentSelectorPresets } from "@/lib/agent-selector-utils"
import type {
  AgentMode,
  AgentModePreset,
  AgentStats,
  SoulConfig,
} from "@/lib/agent-builder-types"

type ModeSelectorProps = {
  selectedMode: AgentMode | null
  selectedPreset: AgentModePreset
  presets: AgentModePreset[]
  soul: SoulConfig
  stats: AgentStats
  skillsEnabled: number
  toolsConnected: number
  onModeChange: (mode: AgentMode) => void
  onContinue: () => void
}

export function ModeSelector({
  selectedMode,
  selectedPreset,
  presets,
  soul,
  stats,
  skillsEnabled,
  toolsConnected,
  onModeChange,
  onContinue,
}: ModeSelectorProps) {
  const selectorPresets = agentSelectorPresets(presets)
  const previewPreset = selectedMode ? selectedPreset : null

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(420px,1fr)_440px]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {selectorPresets.map((preset) => (
          <AgentSelectorCard
            key={preset.mode}
            preset={preset}
            selected={selectedMode === preset.mode}
            onSelect={onModeChange}
          />
        ))}
      </div>
      <AgentSelectorPreview
        preset={previewPreset}
        soul={soul}
        stats={stats}
        skillsEnabled={skillsEnabled}
        toolsConnected={toolsConnected}
        onContinue={onContinue}
      />
    </section>
  )
}
