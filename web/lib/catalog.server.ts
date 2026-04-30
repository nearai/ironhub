import type { CatalogItem } from "@/lib/catalog-types"
import {
  findRepoRoot,
  readSkills,
  readTools,
  readTracking,
} from "@/lib/catalog-readers.server"

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

export function getCatalogStats(items: CatalogItem[]) {
  return {
    total: items.length,
    tools: items.filter((item) => item.kind === "tool").length,
    skills: items.filter((item) => item.kind === "skill").length,
    actions: items.reduce((sum, item) => sum + (item.metrics.actions ?? 0), 0),
    categories: new Set(items.map((item) => item.category)).size,
  }
}

export function getCategories(items: CatalogItem[]) {
  return Array.from(new Set(items.map((item) => item.category))).sort()
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
