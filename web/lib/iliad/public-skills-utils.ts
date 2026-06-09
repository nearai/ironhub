import {
  hubArtifactUrl,
  type IliadArtifactRef,
} from "@/lib/artifact-ref.server"
import type { BaseCatalogItem, CatalogItem } from "@/lib/catalog/types"
import { titleize } from "@/lib/catalog/inference"
import type {
  IliadPublicSkill,
  IliadPublicSkillsListParams,
} from "@/lib/iliad/public-skills-types"
import { links } from "@/lib/shared/links"

const ILIAD_SLUG_PREFIX = "iliad-"

export function tokenizeIliadSkillUrls(
  skill: IliadPublicSkill
): IliadPublicSkill {
  const contentFile: "w" | "s" = skill.kind === "tool" ? "w" : "s"
  const refFor = (file: "w" | "c" | "s"): IliadArtifactRef => [
    "i",
    skill.userId,
    skill.name,
    skill.version,
    file,
  ]
  return {
    ...skill,
    downloadUrl: hubArtifactUrl(refFor(contentFile)),
    capabilitiesUrl: skill.capabilitiesUrl
      ? hubArtifactUrl(refFor("c"))
      : null,
  }
}

export function normalizeIliadListParams(
  params: IliadPublicSkillsListParams
): Required<Pick<IliadPublicSkillsListParams, "limit" | "offset">> &
  Omit<IliadPublicSkillsListParams, "limit" | "offset"> {
  const limit = clampInteger(params.limit, 30, 1, 100)
  const offset = clampInteger(params.offset, 0, 0, Number.MAX_SAFE_INTEGER)

  return {
    ...(params.q ? { q: params.q } : {}),
    ...(params.kind ? { kind: params.kind } : {}),
    ...(params.category ? { category: params.category } : {}),
    limit,
    offset,
  }
}

export function createIliadSkillSlug(skill: IliadPublicSkill) {
  return `${ILIAD_SLUG_PREFIX}${toBase64Url(
    JSON.stringify([skill.userId, skill.name, skill.version])
  )}`
}

export function parseIliadSkillSlug(slug: string) {
  if (!slug.startsWith(ILIAD_SLUG_PREFIX)) {
    return undefined
  }

  try {
    const decoded = JSON.parse(
      fromBase64Url(slug.slice(ILIAD_SLUG_PREFIX.length))
    )

    if (
      Array.isArray(decoded) &&
      typeof decoded[0] === "string" &&
      typeof decoded[1] === "string" &&
      typeof decoded[2] === "string"
    ) {
      return { userId: decoded[0], name: decoded[1], version: decoded[2] }
    }
  } catch {
    return undefined
  }

  return undefined
}

// Maps Iliad skill categoriy endpoints slugs ( api/v1/public-skills?category=slug) to catalog UI categories
const ILIAD_CATEGORY_MAP: Record<string, string> = {
  "ai-ml": "AI & ML",
  automation: "Automation",
  communication: "Communication",
  "data-apis": "Data & APIs",
  "dev-tools": "Dev Tools",
  productivity: "Productivity",
  security: "Security",
  web3: "Web3",
}

export function iliadSkillToCatalogItem(skill: IliadPublicSkill): CatalogItem {
  const categoryName = ILIAD_CATEGORY_MAP[skill.category] ?? "Iliad"

  const baseItem: BaseCatalogItem = {
    slug: createIliadSkillSlug(skill),
    kind: skill.kind,
    origin: "iliad",
    name: titleize(skill.name),
    status: "live",
    version: skill.version,
    description: skill.description?.trim() || null,
    category: categoryName,
    tags: ["Iliad", skill.kind, categoryName].filter(Boolean),
    author: skill.author,
    sourcePath: skill.contentPath,
    links: {
      source: skill.downloadUrl,
      docs: links.iliad,
    },
    metrics: {},
    auth: {
      model: "Catalog gated by Iliad API key",
      requiredSecrets: [],
    },
    limits: [
      "Download URL is presigned by Iliad and expires after 15 minutes.",
      skill.capabilitiesUrl
        ? "Tool capabilities descriptor is available from Iliad."
        : "Prompt skill artifact only.",
    ],
    related: { trunk: "iliad-public-skills" },
    icon: "skill",
    useCases: [],
    valueTags: [],
    body: "",
    remoteUserId: skill.userId,
    contentHash: skill.contentHash,
    contentSize: skill.contentSize,
    contentPath: skill.contentPath,
    capabilitiesPath: skill.capabilitiesPath,
    publishedAt: skill.publishedAt,
    madePublicAt: skill.madePublicAt,
    downloadUrl: skill.downloadUrl,
    capabilitiesUrl: skill.capabilitiesUrl,
  }

  if (skill.kind === "tool") {
    return {
      ...baseItem,
      kind: "tool",
      actionCount: 0,
      witVersion: "unknown",
      httpAllowlist: [],
      requiredSecrets: [],
    }
  }

  return {
    ...baseItem,
    kind: "skill",
    trunk: "iliad-public-skills",
    activationKeywords: [],
    activationPatterns: [],
    maxContextTokens: 0,
  }
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback
  }

  return Math.min(Math.max(value, min), max)
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}
