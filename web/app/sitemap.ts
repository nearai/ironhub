import type { MetadataRoute } from "next"

import { collectionBundleDefinitions } from "@/lib/catalog/collections"
import { getCatalog, getMarketplaceCatalog } from "@/lib/catalog/server"
import { absoluteUrl } from "@/lib/discovery/site"
import { isAgentsRouteDisabled } from "@/lib/shared/feature-flags"
import { getUseCases } from "@/lib/usecases/server"

export const dynamic = "force-dynamic"

const staticRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/marketplace", priority: 0.9, changeFrequency: "daily" },
  { path: "/usecases", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/developer", priority: 0.7, changeFrequency: "monthly" },
  { path: "/insights", priority: 0.6, changeFrequency: "weekly" },
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, useCases] = await Promise.all([
    getPublicCatalogSafely(),
    getUseCases().catch(() => []),
  ])
  const routes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  if (!isAgentsRouteDisabled) {
    routes.push({
      url: absoluteUrl("/agents"),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  routes.push(
    ...items.map((item) => ({
      url: absoluteUrl(`/marketplace/${item.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...useCases.map((useCase) => ({
      url: absoluteUrl(`/usecases/${useCase.id}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...collectionBundleDefinitions.map((collection) => ({
      url: absoluteUrl(`/collections/${collection.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  )

  return deduplicate(routes)
}

async function getPublicCatalogSafely() {
  try {
    return (await getMarketplaceCatalog()).items
  } catch {
    try {
      return await getCatalog()
    } catch {
      return []
    }
  }
}

function deduplicate(routes: MetadataRoute.Sitemap) {
  return [...new Map(routes.map((route) => [route.url, route])).values()]
}
