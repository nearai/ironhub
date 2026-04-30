"use client"

import { AgentPreview } from "@/components/ironhub/agents/agent-preview"
import { BuilderStepNav } from "@/components/ironhub/agents/builder-step-nav"
import { BuilderSummary } from "@/components/ironhub/agents/builder-summary"
import { ExportPanel } from "@/components/ironhub/agents/export-panel"
import { LoadoutPanel } from "@/components/ironhub/agents/loadout-panel"
import { ModeSelector } from "@/components/ironhub/agents/mode-selector"
import { SoulForm } from "@/components/ironhub/agents/soul-form"
import { StatsPanel } from "@/components/ironhub/agents/stats-panel"
import { Button } from "@/components/ui/button"
import { useAgentBuilder } from "@/hooks/use-agent-builder"
import type { LoadoutCatalog } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"

type AgentBuilderProps = {
  catalog: LoadoutCatalog
}

export function AgentBuilder({ catalog }: AgentBuilderProps) {
  const builder = useAgentBuilder(catalog)

  return (
    <div className="grid gap-5">
      {builder.activeStep === "persona" ? null : (
        <BuilderStepNav
          activeStep={builder.activeStep}
          onStepChange={builder.setActiveStep}
        />
      )}
      <div
        className={cn(
          "grid items-start gap-5",
          builder.activeStep !== "persona" &&
            "lg:grid-cols-[minmax(0,1fr)_320px]"
        )}
      >
        <div className="min-w-0">
          {builder.activeStep === "persona" && (
            <ModeSelector
              mode={builder.mode}
              presets={builder.presets}
              onModeChange={builder.setMode}
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
              <StatsPanel stats={builder.stats} />
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
        {builder.activeStep === "persona" ? null : (
          <BuilderSummary
            preset={builder.preset}
            soul={builder.soul}
            stats={builder.stats}
            skillsEnabled={builder.selectedSkills.length}
            toolsConnected={
              builder.selectedTools.length + builder.selectedPlannedTools.length
            }
            onReview={() => builder.setActiveStep("review")}
          />
        )}
      </div>
    </div>
  )
}
