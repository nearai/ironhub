import type { AgentStats, SoulConfig } from "@/lib/agent-builder-types"

export function availableSlugs(items: { slug: string }[], slugs: string[]) {
  const available = new Set(items.map((item) => item.slug))
  return slugs.filter((slug) => available.has(slug))
}

export function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export function calculateStats(input: {
  autonomy: number
  privacyMode: SoulConfig["privacyMode"]
  memoryMode: SoulConfig["memoryMode"]
  approvalPolicy: SoulConfig["approvalPolicy"]
  skills: number
  tools: number
  planned: number
  chain: boolean
}): AgentStats {
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

export function slugifyAgentName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ironclaw-agent"
  )
}

export function statRows(stats: AgentStats) {
  return [
    { label: "Autonomy", value: stats.autonomy },
    { label: "Security", value: stats.security },
    { label: "Memory", value: stats.memory },
    { label: "Tool power", value: stats.toolPower },
    { label: "Chain access", value: stats.chainAccess },
  ]
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
