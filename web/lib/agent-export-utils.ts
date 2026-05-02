import type {
  AgentExportConfig,
  AgentMode,
  AgentStats,
  AppearanceConfig,
  PlannedTool,
  SoulConfig,
} from "@/lib/agent-builder-types"
import type { CatalogItem } from "@/lib/catalog-types"

type BuildAgentExportConfigInput = {
  mode: AgentMode
  presetLabel: string
  soul: SoulConfig
  selectedSkills: CatalogItem[]
  selectedTools: CatalogItem[]
  selectedPlannedTools: PlannedTool[]
  appearance: AppearanceConfig
  stats: AgentStats
  generatedAt: string
}

export function buildAgentExportConfig({
  mode,
  presetLabel,
  soul,
  selectedSkills,
  selectedTools,
  selectedPlannedTools,
  appearance,
  stats,
  generatedAt,
}: BuildAgentExportConfigInput): AgentExportConfig {
  return {
    version: "ironclaw.agent.v1",
    agent: { mode, name: soul.name, type: soul.title },
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
  }
}
