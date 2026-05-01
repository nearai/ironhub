import { CATEGORIES } from "@/lib/catalog-inference"
import type { CatalogItem } from "@/lib/catalog-types"
import {
  findRepoRoot,
  readSkills,
  readTools,
  readTracking,
} from "@/lib/catalog-readers.server"
import {
  getIliadCatalogItem,
  getIliadCatalogItems,
} from "@/lib/iliad-public-skills.server"

export async function getCatalog() {
  const root = await findRepoRoot()
  const tracking = await readTracking(root)
  const [tools, skills] = await Promise.all([
    readTools(root, tracking.tools),
    readSkills(root, tracking.skills),
  ])
  const items = [...tools, ...skills].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const branchMap = getSkillBranchMap(items)

  return items.map((item) => {
    if (item.kind === "tool") {
      return {
        ...item,
        related: { ...item.related, branches: branchMap.get(item.slug) ?? [] },
      }
    }

    return item
  })
}

export async function getCatalogItem(slug: string) {
  const items = await getCatalog()
  return items.find((item) => item.slug === slug)
}

export async function getMarketplaceCatalog() {
  const [repoItems, iliadCatalog] = await Promise.all([
    getCatalog(),
    getIliadCatalogItems(),
  ])

  return {
    items: [...repoItems, ...iliadCatalog.items],
    iliad: {
      loaded: iliadCatalog.items.length,
      total: iliadCatalog.total,
      error: iliadCatalog.error,
    },
  }
}

export async function getMarketplaceCatalogItem(slug: string) {
  const localItem = await getCatalogItem(slug)

  if (localItem) {
    return localItem
  }

  try {
    return await getIliadCatalogItem(slug)
  } catch {
    return undefined
  }
}

export function getCatalogStats(items: CatalogItem[]) {
  return {
    total: items.length,
    tools: items.filter((item) => item.kind === "tool").length,
    skills: items.filter((item) => item.kind === "skill").length,
    iliad: items.filter((item) => item.origin === "iliad").length,
    actions: items.reduce((sum, item) => sum + (item.metrics.actions ?? 0), 0),
    categories: new Set(items.map((item) => item.category)).size,
  }
}

export function getCategories(items: CatalogItem[]) {
  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return [...CATEGORIES].sort((a, b) => {
    const diff = (counts[b] ?? 0) - (counts[a] ?? 0)
    if (diff !== 0) return diff
    return a.localeCompare(b)
  })
}

function getSkillBranchMap(items: CatalogItem[]) {
  const branchMap = new Map<string, string[]>()

  for (const item of items) {
    if (item.kind === "skill") {
      branchMap.set(item.trunk, [
        ...(branchMap.get(item.trunk) ?? []),
        item.slug,
      ])
    }
  }

  return branchMap
}
