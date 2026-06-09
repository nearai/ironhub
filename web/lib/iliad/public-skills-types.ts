import type { CatalogKind } from "@/lib/catalog/types"

export type IliadAuthorTrustTier = "trusted" | "verified" | "new" | "banned"

export type IliadPublicSkill = {
  userId: string
  name: string
  version: string
  description: string | null
  category: string
  kind: CatalogKind
  contentHash: string
  contentSize: number
  contentPath: string
  capabilitiesPath: string | null
  capabilitiesHash: string | null
  capabilitiesSize: number | null
  authorTrustTier: IliadAuthorTrustTier
  author: string
  publishedAt: string
  madePublicAt: string
  downloadUrl: string
  capabilitiesUrl: string | null
}

export type IliadPublicSkillsListParams = {
  q?: string
  kind?: CatalogKind
  category?: string
  limit?: number
  offset?: number
}

export type IliadPublicSkillsList = {
  total: number
  skills: IliadPublicSkill[]
}
