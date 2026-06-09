import type {
  IliadPublicSkill,
  IliadPublicSkillsList,
  IliadPublicSkillsListParams,
} from "@/lib/iliad/public-skills-types"
import {
  iliadSkillToCatalogItem,
  normalizeIliadListParams,
  parseIliadSkillSlug,
} from "@/lib/iliad/public-skills-utils"

class IliadPublicSkillsError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message)
  }
}

export async function fetchIliadPublicSkillsList(
  params: IliadPublicSkillsListParams = {}
): Promise<IliadPublicSkillsList> {
  const url = new URL(getIliadBaseUrl())
  const normalized = normalizeIliadListParams(params)

  for (const [key, value] of Object.entries(normalized)) {
    url.searchParams.set(key, String(value))
  }

  return fetchIliadJson<IliadPublicSkillsList>(url)
}

export async function fetchIliadPublicSkill(
  userId: string,
  name: string,
  version: string
): Promise<IliadPublicSkill> {
  const url = new URL(
    `${getIliadBaseUrl()}/${encodeURIComponent(userId)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
  )

  return fetchIliadJson<IliadPublicSkill>(url)
}

export async function getIliadCatalogItems() {
  const categories = [
    "ai-ml",
    "automation",
    "communication",
    "data-apis",
    "dev-tools",
    "productivity",
    "security",
    "web3",
  ]

  try {
    const lists = await Promise.all(
      categories.map(async (category) => {
        try {
          const list = await fetchIliadPublicSkillsList({
            category,
            limit: 200,
          })
          return list.skills.map(iliadSkillToCatalogItem)
        } catch (error) {
          console.error(
            `Failed to fetch Iliad skills for category: ${category}`,
            error
          )
          return []
        }
      })
    )

    const allItems = lists.flat()

    const uniqueItems = new Map<
      string,
      ReturnType<typeof iliadSkillToCatalogItem>
    >()
    for (const item of allItems) {
      if (!uniqueItems.has(item.slug)) {
        uniqueItems.set(item.slug, item)
      }
    }

    const items = Array.from(uniqueItems.values())

    return {
      items,
      total: items.length,
      error: null,
    }
  } catch (error) {
    return {
      items: [],
      total: 0,
      error: getIliadErrorMessage(error),
    }
  }
}

export async function getIliadCatalogItem(slug: string) {
  const identity = parseIliadSkillSlug(slug)

  if (!identity) {
    return undefined
  }

  const skill = await fetchIliadPublicSkill(
    identity.userId,
    identity.name,
    identity.version
  )

  return iliadSkillToCatalogItem(skill)
}

export function getIliadErrorResponse(error: unknown) {
  if (error instanceof IliadPublicSkillsError) {
    return { status: error.status, message: error.message }
  }

  return { status: 500, message: "Unable to load Iliad public skills." }
}

export function getIliadErrorMessage(error: unknown) {
  return getIliadErrorResponse(error).message
}

async function fetchIliadJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "X-API-Key": getIliadApiKey(),
    },
  })

  if (!response.ok) {
    throw new IliadPublicSkillsError(
      `Iliad public skills request failed with ${response.status}.`,
      response.status
    )
  }

  return unwrapIliadResponse<T>(await response.json())
}

function getIliadBaseUrl() {
  const baseUrl = process.env.ILIAD_BASE_URL

  if (!baseUrl) {
    throw new IliadPublicSkillsError(
      "Missing ILIAD_BASE_URL for Iliad public skills.",
      500
    )
  }

  return baseUrl
}

function getIliadApiKey() {
  const apiKey = process.env.ILIAD_X_API_KEY

  if (!apiKey) {
    throw new IliadPublicSkillsError(
      "Missing ILIAD_X_API_KEY for Iliad public skills.",
      500
    )
  }

  return apiKey
}

function unwrapIliadResponse<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as {
      success: boolean
      data?: T
      error?: string
      message?: string
    }

    if (envelope.success && envelope.data) {
      return envelope.data
    }

    throw new IliadPublicSkillsError(
      envelope.error ??
        envelope.message ??
        "Iliad public skills request failed."
    )
  }

  return payload as T
}
