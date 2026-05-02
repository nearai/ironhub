import type { CatalogItem } from "@/lib/catalog-types"

export type AgentMode =
  | "personal-assistant"
  | "developer-agent"
  | "research-agent"
  | "on-chain-agent"
  | "security-agent"
  | "data-analyst"
  | "content-writer"
  | "ops-agent"
  | "trading-agent"
  | "custom"

export type BuilderStep = "persona" | "soul" | "loadout" | "review"
export type PrivacyMode = "strict" | "balanced" | "open"
export type MemoryMode = "off" | "session" | "persistent"
export type ApprovalPolicy = "manual" | "high-impact" | "autonomous"
export type AvatarStyle = "paladin" | "sentinel" | "scholar" | "oracle"
export type BuilderTheme = "iron" | "ember" | "arc" | "signal"

export type AgentPersonaArtwork = {
  src: string
  alt: string
  accent: string
}

export type SoulConfig = {
  name: string
  title: string
  mission: string
  personality: string
  autonomy: number
  privacyMode: PrivacyMode
  memoryMode: MemoryMode
  approvalPolicy: ApprovalPolicy
}

export type AgentStats = {
  autonomy: number
  security: number
  memory: number
  toolPower: number
  chainAccess: number
}

export type PlannedTool = {
  slug: string
  name: string
  description: string
  category: string
}

export type AppearanceConfig = {
  avatar: AvatarStyle
  theme: BuilderTheme
}

export type AgentModePreset = {
  mode: AgentMode
  label: string
  description: string
  badge: string
  artwork: AgentPersonaArtwork
  defaultSoul: SoulConfig
  appearance: AppearanceConfig
  skillSlugs: string[]
  toolSlugs: string[]
  plannedToolSlugs: string[]
}

export type LoadoutCatalog = {
  skills: CatalogItem[]
  tools: CatalogItem[]
}

export type AgentExportConfig = {
  version: "ironclaw.agent.v1"
  agent: {
    mode: AgentMode
    name: string
    type: string
  }
  soul: SoulConfig
  skills: {
    enabled: Array<{
      slug: string
      name: string
      sourcePath: string
    }>
  }
  tools: {
    enabled: Array<{
      slug: string
      name: string
      status: "connected" | "planned"
      sourcePath?: string
    }>
  }
  appearance: AppearanceConfig
  stats: AgentStats
  generatedAt: string
}
