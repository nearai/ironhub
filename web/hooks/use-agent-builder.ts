"use client"

import { useMemo, useState } from "react"
import {
  getModePreset,
  modePresets,
  plannedTools,
} from "@/lib/agent-builder-presets"
import {
  availableSlugs,
  calculateStats,
  toggleValue,
} from "@/lib/agent-builder-utils"
import { buildAgentExportConfig } from "@/lib/agent-export-utils"
import type {
  AgentMode,
  AppearanceConfig,
  BuilderStep,
  LoadoutCatalog,
  SoulConfig,
} from "@/lib/agent-builder-types"

export function useAgentBuilder(catalog: LoadoutCatalog) {
  const initialPreset = getModePreset("developer-agent")
  const [generatedAt] = useState(() => new Date().toISOString())
  const [activeStep, setActiveStep] = useState<BuilderStep>("persona")
  const [mode, setModeState] = useState<AgentMode>(initialPreset.mode)
  const [soul, setSoul] = useState<SoulConfig>(initialPreset.defaultSoul)
  const [appearance, setAppearance] = useState<AppearanceConfig>(
    initialPreset.appearance
  )
  const [enabledSkills, setEnabledSkills] = useState<string[]>(
    availableSlugs(catalog.skills, initialPreset.skillSlugs)
  )
  const [enabledTools, setEnabledTools] = useState<string[]>(
    availableSlugs(catalog.tools, initialPreset.toolSlugs)
  )
  const [enabledPlannedTools, setEnabledPlannedTools] = useState<string[]>(
    initialPreset.plannedToolSlugs
  )

  const preset = getModePreset(mode)
  const selectedSkills = catalog.skills.filter((item) =>
    enabledSkills.includes(item.slug)
  )
  const selectedTools = catalog.tools.filter((item) =>
    enabledTools.includes(item.slug)
  )
  const selectedPlannedTools = plannedTools.filter((tool) =>
    enabledPlannedTools.includes(tool.slug)
  )
  const stats = useMemo(
    () =>
      calculateStats({
        autonomy: soul.autonomy,
        privacyMode: soul.privacyMode,
        memoryMode: soul.memoryMode,
        approvalPolicy: soul.approvalPolicy,
        skills: selectedSkills.length,
        tools: selectedTools.length,
        planned: selectedPlannedTools.length,
        chain: enabledTools.includes("near-rpc"),
      }),
    [
      soul,
      selectedSkills.length,
      selectedTools.length,
      selectedPlannedTools.length,
      enabledTools,
    ]
  )
  const exportConfig = useMemo(
    () =>
      buildAgentExportConfig({
        mode,
        presetLabel: preset.label,
        soul,
        selectedSkills,
        selectedTools,
        selectedPlannedTools,
        appearance,
        stats,
        generatedAt,
      }),
    [
      appearance,
      generatedAt,
      mode,
      preset.label,
      selectedPlannedTools,
      selectedSkills,
      selectedTools,
      soul,
      stats,
    ]
  )

  function setMode(nextMode: AgentMode) {
    const nextPreset = getModePreset(nextMode)
    setModeState(nextMode)
    setSoul(nextPreset.defaultSoul)
    setAppearance(nextPreset.appearance)
    setEnabledSkills(availableSlugs(catalog.skills, nextPreset.skillSlugs))
    setEnabledTools(availableSlugs(catalog.tools, nextPreset.toolSlugs))
    setEnabledPlannedTools(nextPreset.plannedToolSlugs)
  }

  function updateSoul(nextSoul: Partial<SoulConfig>) {
    setSoul((current) => ({ ...current, ...nextSoul }))
  }

  function toggleSkill(slug: string) {
    setEnabledSkills((current) => toggleValue(current, slug))
  }

  function toggleTool(slug: string) {
    setEnabledTools((current) => toggleValue(current, slug))
  }

  function togglePlannedTool(slug: string) {
    setEnabledPlannedTools((current) => toggleValue(current, slug))
  }

  return {
    mode,
    activeStep,
    setActiveStep,
    preset,
    presets: modePresets,
    soul,
    updateSoul,
    appearance,
    setAppearance,
    setMode,
    enabledSkills,
    enabledTools,
    enabledPlannedTools,
    toggleSkill,
    toggleTool,
    togglePlannedTool,
    selectedSkills,
    selectedTools,
    selectedPlannedTools,
    plannedTools,
    stats,
    exportConfig,
    exportJson: JSON.stringify(exportConfig, null, 2),
  }
}
