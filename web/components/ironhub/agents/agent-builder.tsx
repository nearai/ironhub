"use client"

import { useState } from "react"
import { AgentPreview } from "@/components/ironhub/agents/agent-preview"
import { BuilderSummary } from "@/components/ironhub/agents/builder-summary"
import { BuilderStepNav } from "@/components/ironhub/agents/builder-step-nav"
import { ExportPanel } from "@/components/ironhub/agents/export-panel"
import { LoadoutPanel } from "@/components/ironhub/agents/loadout-panel"
import { ModeSelector } from "@/components/ironhub/agents/mode-selector"
import { SoulForm } from "@/components/ironhub/agents/soul-form"
import { Button } from "@/components/ui/button"
import { useAgentBuilder } from "@/hooks/use-agent-builder"
import type { AgentMode, LoadoutCatalog } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"

type AgentBuilderProps = {
  catalog: LoadoutCatalog
}

export function AgentBuilder({ catalog }: AgentBuilderProps) {
  const builder = useAgentBuilder(catalog)
  const [selectedMode, setSelectedMode] = useState<AgentMode | null>(null)
  const showBuildSummary =
    builder.activeStep === "soul" || builder.activeStep === "loadout"

  function handleModeChange(nextMode: AgentMode) {
    builder.setMode(nextMode)
    setSelectedMode(nextMode)
  }

  return (
    <div className="grid gap-5">
      <BuilderStepNav
        activeStep={builder.activeStep}
        onStepChange={builder.setActiveStep}
      />
      <div
        className={cn(
          "grid items-start gap-5",
          showBuildSummary && "lg:grid-cols-[minmax(0,1fr)_340px]"
        )}
      >
        <div className="min-w-0">
          {builder.activeStep === "persona" && (
            <ModeSelector
              selectedMode={selectedMode}
              selectedPreset={builder.preset}
              presets={builder.presets}
              soul={builder.soul}
              stats={builder.stats}
              skillsEnabled={builder.selectedSkills.length}
              toolsConnected={builder.selectedTools.length}
              onModeChange={handleModeChange}
              onContinue={() => builder.setActiveStep("soul")}
            />
          )}
          {builder.activeStep === "soul" && (
            <SoulForm
              soul={builder.soul}
              appearance={builder.appearance}
              onSoulChange={builder.updateSoul}
              onAppearanceChange={builder.setAppearance}
              onBack={() => builder.setActiveStep("persona")}
              onContinue={() => builder.setActiveStep("loadout")}
            />
          )}
          {builder.activeStep === "loadout" && (
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
              onBack={() => builder.setActiveStep("soul")}
              onContinue={() => builder.setActiveStep("review")}
            />
          )}
          {builder.activeStep === "review" && (
            <div className="grid gap-5">
              <AgentPreview
                preset={builder.preset}
                soul={builder.soul}
                stats={builder.stats}
                skillsEnabled={builder.selectedSkills.length}
                toolsConnected={builder.selectedTools.length}
              />
              <ExportPanel
                agentName={builder.soul.name}
                exportJson={builder.exportJson}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => builder.setActiveStep("loadout")}
              >
                Back to loadout
              </Button>
            </div>
          )}
        </div>
        {showBuildSummary ? (
          <BuilderSummary
            preset={builder.preset}
            soul={builder.soul}
            stats={builder.stats}
          />
        ) : null}
      </div>
    </div>
  )
}
