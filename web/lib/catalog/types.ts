export type CatalogKind = "tool" | "skill" | "collection"
export type CatalogOrigin = "repo" | "iliad"
export type CatalogStatus = "live" | "proposed" | "in-progress" | "blocked"

type CatalogLinks = {
  source: string
  setup?: string
  docs?: string
  issue?: string
}

type CatalogMetrics = {
  actions?: number
  keywords?: number
  patterns?: number
}

type CatalogAuth = {
  model: string
  requiredSecrets: string[]
  optionalSecrets: string[]
  credentials: CatalogCredential[]
}

export type CatalogCredential = {
  name: string
  provider?: string
  method: string
  required: boolean
  hosts: string[]
}

type CatalogRelated = {
  trunk?: string
  branches?: string[]
}

export type BaseCatalogItem = {
  slug: string
  kind: CatalogKind
  origin?: CatalogOrigin
  name: string
  status: CatalogStatus
  version: string
  description: string | null
  category: string
  tags: string[]
  author: string
  sourcePath: string
  links: CatalogLinks
  metrics: CatalogMetrics
  auth: CatalogAuth
  limits: string[]
  related: CatalogRelated
  icon: "microsoft" | "near" | "workflow" | "tool" | "skill"
  useCases: string[]
  valueTags: string[]
  body: string
  remoteUserId?: string
  contentHash?: string
  contentSize?: number
  contentPath?: string
  capabilitiesPath?: string | null
  publishedAt?: string
  madePublicAt?: string
  downloadUrl?: string
  capabilitiesUrl?: string | null
}

export type ToolCatalogItem = BaseCatalogItem & {
  kind: "tool"
  actionCount: number
  witVersion: string
  httpAllowlist: string[]
  requiredSecrets: string[]
  effects: string[]
  defaultPermissions: string[]
}

export type SkillCatalogItem = BaseCatalogItem & {
  kind: "skill"
  trunk: string
  activationKeywords: string[]
  activationPatterns: string[]
  maxContextTokens: number
}

export type CatalogItem = ToolCatalogItem | SkillCatalogItem
