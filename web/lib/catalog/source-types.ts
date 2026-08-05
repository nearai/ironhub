export type CapabilityManifest = {
  version?: string
  wit_version?: string
  description?: string
  effects?: string[]
  http?: {
    allowlist?: Array<{ host?: string }>
    credentials?: Record<string, LegacyCredential>
  }
  secrets?: {
    allowed_names?: string[]
  }
  capabilities?: {
    effects?: string[]
    http?: {
      allowlist?: Array<{ host?: string }>
      credentials?: Record<string, LegacyCredential>
    }
    secrets?: {
      allowed_names?: string[]
    }
  }
  auth?: {
    secret_name?: string
    display_name?: string
    oauth?: {
      use_pkce?: boolean
    }
  }
  setup?: {
    required_secrets?: Array<{
      name?: string
      optional?: boolean
    }>
  }
}

export type LegacyCredential = {
  secret_name?: string
  location?: {
    type?: string
    name?: string
    prefix?: string
  }
  host_patterns?: string[]
  optional?: boolean
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
