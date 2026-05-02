import type { CatalogItem } from "@/lib/catalog-types"

export type CollectionBundleDefinition = {
  slug: string
  title: string
  summary: string
  outcome: string
  query: string
  keywords: string[]
}

export type CollectionBundle = CollectionBundleDefinition & {
  kind: "collection"
  items: CatalogItem[]
  toolCount: number
  skillCount: number
}

export const collectionBundleDefinitions = [
  {
    slug: "agent-builder",
    title: "Agent Builder Stack",
    summary:
      "Everything needed to spec, wire, test, and ship a repo-backed agent.",
    outcome: "Build agents with clear APIs, docs, prompts, and release checks.",
    query: "api",
    keywords: [
      "agent",
      "api",
      "workflow",
      "developer",
      "code",
      "documentation",
      "project",
      "testing",
      "integration",
      "automation",
    ],
  },
  {
    slug: "security-review",
    title: "Security Review Pack",
    summary:
      "A focused bundle for app hardening, compliance, access, and risk review.",
    outcome:
      "Run practical security checks before installing or publishing tools.",
    query: "security",
    keywords: [
      "security",
      "privacy",
      "compliance",
      "risk",
      "audit",
      "access",
      "owasp",
      "safety",
      "secrets",
      "headers",
    ],
  },
  {
    slug: "content-studio",
    title: "Content Studio Kit",
    summary:
      "Planning, brand, writing, video, podcast, and campaign production tools.",
    outcome:
      "Turn product ideas into consistent launch, content, and media assets.",
    query: "content",
    keywords: [
      "content",
      "brand",
      "writing",
      "video",
      "podcast",
      "marketing",
      "editorial",
      "social",
      "voice",
      "copy",
    ],
  },
  {
    slug: "business-operations",
    title: "Business Operations Suite",
    summary:
      "Planning, finance, Microsoft 365, spreadsheets, and operating cadence.",
    outcome:
      "Coordinate business workflows across docs, meetings, sheets, and plans.",
    query: "business",
    keywords: [
      "business",
      "microsoft",
      "spreadsheet",
      "finance",
      "operations",
      "agile",
      "meeting",
      "excel",
      "outlook",
      "plan",
    ],
  },
  {
    slug: "onchain-data",
    title: "On-Chain Data Desk",
    summary:
      "NEAR operations, market intelligence, public data, and research workflows.",
    outcome:
      "Inspect chain state, monitor markets, and turn data into decisions.",
    query: "near",
    keywords: [
      "near",
      "rpc",
      "blockchain",
      "market",
      "data",
      "research",
      "validator",
      "contract",
      "analysis",
      "polymarket",
    ],
  },
  {
    slug: "product-design",
    title: "Product Design Lab",
    summary:
      "User research, accessibility, visual identity, product strategy, and UX.",
    outcome:
      "Shape clearer products from research through launch-ready design assets.",
    query: "design",
    keywords: [
      "product",
      "design",
      "user",
      "ux",
      "visual",
      "brand",
      "accessibility",
      "prototype",
      "customer",
      "strategy",
    ],
  },
] satisfies CollectionBundleDefinition[]

export function buildCollectionBundles(items: CatalogItem[]) {
  return collectionBundleDefinitions.map((definition) => {
    const bundleItems = selectBundleItems(items, definition.keywords)

    return {
      ...definition,
      kind: "collection" as const,
      items: bundleItems,
      toolCount: bundleItems.filter((item) => item.kind === "tool").length,
      skillCount: bundleItems.filter((item) => item.kind === "skill").length,
    }
  })
}

export function getCollectionBundle(items: CatalogItem[], slug: string) {
  return buildCollectionBundles(items).find((bundle) => bundle.slug === slug)
}

function selectBundleItems(items: CatalogItem[], keywords: string[]) {
  const ranked = items
    .map((item) => ({ item, score: scoreItem(item, keywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)

  if (ranked.length >= 10) {
    return ranked.slice(0, 18)
  }

  const fallback = [...items]
    .sort((a, b) => scoreByCatalogStrength(b) - scoreByCatalogStrength(a))
    .filter(
      (item) => !ranked.some((rankedItem) => rankedItem.slug === item.slug)
    )

  return [...ranked, ...fallback].slice(0, 12)
}

function scoreItem(item: CatalogItem, keywords: string[]) {
  const haystack = [
    item.name,
    item.slug,
    item.description,
    item.category,
    ...item.tags,
    ...item.limits,
  ]
    .join(" ")
    .toLowerCase()

  return keywords.reduce((score, keyword) => {
    return haystack.includes(keyword) ? score + 1 : score
  }, 0)
}

function scoreByCatalogStrength(item: CatalogItem) {
  return (
    (item.metrics.actions ?? 0) +
    (item.metrics.keywords ?? 0) +
    item.tags.length
  )
}
