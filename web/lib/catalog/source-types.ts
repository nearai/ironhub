export type CapabilityManifest = {
  version?: string
  wit_version?: string
  description?: string
  http?: {
    allowlist?: Array<{ host?: string }>
    credentials?: Record<string, unknown>
  }
  secrets?: {
    allowed_names?: string[]
  }
  auth?: {
    display_name?: string
    oauth?: unknown
  }
}

export type SkillFrontmatter = {
  name?: string
  version?: string
  description?: string
  author?: string
  trunk?: string
  tags: string[]
  keywords: string[]
  patterns: string[]
  maxContextTokens: number
  useCases: string[]
  valueTags: string[]
}
