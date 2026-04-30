"use client"

import { AgentPreview } from "@/components/ironhub/agents/agent-preview"
import { ExportPanel } from "@/components/ironhub/agents/export-panel"
import { LoadoutPanel } from "@/components/ironhub/agents/loadout-panel"
import { ModeSelector } from "@/components/ironhub/agents/mode-selector"
import { SoulForm } from "@/components/ironhub/agents/soul-form"
import { StatsPanel } from "@/components/ironhub/agents/stats-panel"
import { useAgentBuilder } from "@/hooks/use-agent-builder"
import type { LoadoutCatalog } from "@/lib/agent-builder-types"

type AgentBuilderProps = {
  catalog: LoadoutCatalog
}

export function AgentBuilder({ catalog }: AgentBuilderProps) {
  const builder = useAgentBuilder(catalog)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.25fr)_minmax(300px,0.95fr)]">
      <div className="grid content-start gap-5">
        <ModeSelector
          mode={builder.mode}
          presets={builder.presets}
          onModeChange={builder.setMode}
        />
        <SoulForm
          soul={builder.soul}
          appearance={builder.appearance}
          onSoulChange={builder.updateSoul}
          onAppearanceChange={builder.setAppearance}
        />
      </div>
      <div className="grid content-start gap-5">
        <AgentPreview
          preset={builder.preset}
          soul={builder.soul}
          appearance={builder.appearance}
          stats={builder.stats}
          skillsEnabled={builder.selectedSkills.length}
          toolsConnected={builder.selectedTools.length}
        />
        <StatsPanel stats={builder.stats} />
      </div>
      <div className="grid content-start gap-5">
        <LoadoutPanel
          skills={catalog.skills}
          tools={catalog.tools}
          plannedTools={builder.plannedTools}
          enabledSkills={builder.enabledSkills}
          enabledTools={builder.enabledTools}
          enabledPlannedTools={builder.enabledPlannedTools}
          onSkillToggle={builder.toggleSkill}
          onToolToggle={builder.toggleTool}
          onPlannedToolToggle={builder.togglePlannedTool}
        />
        <ExportPanel
          agentName={builder.soul.name}
          exportJson={builder.exportJson}
        />
      </div>
    </div>
  )
}
