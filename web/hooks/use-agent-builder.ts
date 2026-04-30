"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getModePreset,
  modePresets,
  plannedTools,
} from "@/lib/agent-builder-presets"
import type {
  AgentExportConfig,
  AgentMode,
  AppearanceConfig,
  LoadoutCatalog,
  SoulConfig,
} from "@/lib/agent-builder-types"

export function useAgentBuilder(catalog: LoadoutCatalog) {
  const initialPreset = getModePreset("developer-agent")
  const [generatedAt, setGeneratedAt] = useState("")
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
  const exportConfig = useMemo<AgentExportConfig>(
    () => ({
      version: "ironclaw.agent.v1",
      agent: { mode, name: soul.name, type: preset.label },
      soul,
      skills: {
        enabled: selectedSkills.map((skill) => ({
          slug: skill.slug,
          name: skill.name,
          sourcePath: skill.sourcePath,
        })),
      },
      tools: {
        enabled: [
          ...selectedTools.map((tool) => ({
            slug: tool.slug,
            name: tool.name,
            status: "connected" as const,
            sourcePath: tool.sourcePath,
          })),
          ...selectedPlannedTools.map((tool) => ({
            slug: tool.slug,
            name: tool.name,
            status: "planned" as const,
          })),
        ],
      },
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

  useEffect(() => {
    setGeneratedAt(new Date().toISOString())
  }, [])

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

function availableSlugs(items: { slug: string }[], slugs: string[]) {
  const available = new Set(items.map((item) => item.slug))
  return slugs.filter((slug) => available.has(slug))
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function calculateStats(input: {
  autonomy: number
  privacyMode: SoulConfig["privacyMode"]
  memoryMode: SoulConfig["memoryMode"]
  approvalPolicy: SoulConfig["approvalPolicy"]
  skills: number
  tools: number
  planned: number
  chain: boolean
}) {
  const approvalSecurity =
    input.approvalPolicy === "manual"
      ? 24
      : input.approvalPolicy === "high-impact"
        ? 14
        : 4
  const privacySecurity =
    input.privacyMode === "strict"
      ? 48
      : input.privacyMode === "balanced"
        ? 34
        : 18
  const memory =
    input.memoryMode === "persistent"
      ? 88
      : input.memoryMode === "session"
        ? 56
        : 12

  return {
    autonomy: input.autonomy,
    security: clamp(
      privacySecurity + approvalSecurity + (100 - input.autonomy) / 5
    ),
    memory,
    toolPower: clamp(
      input.tools * 24 +
        input.planned * 10 +
        input.skills * 16 +
        input.autonomy / 5
    ),
    chainAccess: input.chain ? 92 : input.planned > 0 ? 28 : 8,
  }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
