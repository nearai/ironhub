import type {
  AgentMode,
  AgentModePreset,
  AgentStats,
  SoulConfig,
} from "@/lib/agent-builder-types"

export const agentSelectorModeOrder: AgentMode[] = [
  "research-agent",
  "personal-assistant",
  "developer-agent",
  "on-chain-agent",
  "ops-agent",
  "trading-agent",
  "security-agent",
  "content-writer",
  "data-analyst",
  "custom",
]

const shortLabels: Partial<Record<AgentMode, string>> = {
  "research-agent": "Researcher",
  "personal-assistant": "Assistant",
  "developer-agent": "Developer",
  "on-chain-agent": "On-Chain",
  "ops-agent": "Ops",
  "trading-agent": "Trader",
  "security-agent": "Security",
  "content-writer": "Writer",
  "data-analyst": "Data Analyst",
  custom: "Custom",
}

export function agentSelectorPresets(presets: AgentModePreset[]) {
  const presetMap = new Map(presets.map((preset) => [preset.mode, preset]))

  return agentSelectorModeOrder
    .map((mode) => presetMap.get(mode))
    .filter((preset): preset is AgentModePreset => Boolean(preset))
}

export function agentSelectorLabel(mode: AgentMode) {
  return shortLabels[mode] ?? "Agent"
}

export function selectorMetricTiles(input: {
  skillsEnabled: number
  toolsConnected: number
  soul: SoulConfig
}) {
  return [
    { label: "Skills enabled", value: input.skillsEnabled },
    { label: "Tools connected", value: input.toolsConnected },
    {
      label: "Soul status",
      value: input.soul.name.trim() && input.soul.mission.trim() ? "Ready" : "Draft",
    },
  ]
}

export function selectorStatRows(stats: AgentStats) {
  return [
    { label: "Autonomy", value: stats.autonomy },
    { label: "Security", value: stats.security },
    { label: "Memory", value: stats.memory },
    { label: "Tool Power", value: stats.toolPower },
    { label: "Chain Access", value: stats.chainAccess },
  ]
}
