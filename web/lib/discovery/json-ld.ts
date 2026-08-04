import type { CollectionBundle } from "@/lib/catalog/collections"
import type { CatalogItem } from "@/lib/catalog/types"
import type { UseCase } from "@/lib/usecases/types"

import { absoluteUrl, siteConfig } from "./site.ts"

export type JsonLdValue = Record<string, unknown> | Record<string, unknown>[]

export function serializeJsonLd(value: JsonLdValue) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function buildSiteJsonLd(): JsonLdValue {
  const organizationId = absoluteUrl("/#organization")
  const websiteId = absoluteUrl("/#website")

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.name,
        url: absoluteUrl("/"),
        sameAs: [siteConfig.repository],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteConfig.name,
        description: siteConfig.description,
        url: absoluteUrl("/"),
        publisher: { "@id": organizationId },
      },
    ],
  }
}

export function buildCatalogListingJsonLd(items: CatalogItem[]): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "IronHub Skills and Tools",
    description:
      "Browse repo-backed IronClaw skills, WebAssembly tools, and public community skills.",
    url: absoluteUrl("/marketplace"),
    mainEntity: itemList(
      items.map((item) => ({
        name: item.name,
        path: `/marketplace/${item.slug}`,
      }))
    ),
  }
}

export function buildCatalogItemJsonLd(item: CatalogItem): JsonLdValue {
  const path = `/marketplace/${item.slug}`
  const authorType = item.author === "IronHub" ? "Organization" : "Person"
  const entity =
    item.kind === "tool"
      ? {
          "@type": "SoftwareSourceCode",
          name: item.name,
          description: item.description || undefined,
          url: absoluteUrl(path),
          codeRepository: item.links.source,
          version: item.version,
          runtimePlatform: "WebAssembly",
          programmingLanguage: "Rust",
          keywords: item.tags.join(", "),
          author: { "@type": authorType, name: item.author },
        }
      : {
          "@type": "CreativeWork",
          name: item.name,
          description: item.description || undefined,
          url: absoluteUrl(path),
          version: item.version,
          encodingFormat: "text/markdown",
          keywords: item.tags.join(", "),
          author: { "@type": authorType, name: item.author },
        }

  return {
    "@context": "https://schema.org",
    "@graph": [
      entity,
      breadcrumb(path, item.name, "Marketplace", "/marketplace"),
    ],
  }
}

export function buildCollectionJsonLd(
  collection: CollectionBundle
): JsonLdValue {
  const path = `/collections/${collection.slug}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: collection.title,
        description: collection.outcome,
        url: absoluteUrl(path),
        mainEntity: itemList(
          collection.items.map((item) => ({
            name: item.name,
            path: `/marketplace/${item.slug}`,
          }))
        ),
      },
      breadcrumb(path, collection.title, "Marketplace", "/marketplace"),
    ],
  }
}

export function buildUseCasesListingJsonLd(useCases: UseCase[]): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "IronClaw Use Cases",
    description:
      "Community-built IronClaw workflows, automations, and agent configurations.",
    url: absoluteUrl("/usecases"),
    mainEntity: itemList(
      useCases.map((useCase) => ({
        name: useCase.title,
        path: `/usecases/${useCase.id}`,
      }))
    ),
  }
}

export function buildUseCaseJsonLd(useCase: UseCase): JsonLdValue {
  const path = `/usecases/${useCase.id}`
  const steps = extractSteps(useCase.agentDoes)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        name: useCase.title,
        description: useCase.examplePrompt,
        url: absoluteUrl(path),
        keywords: useCase.categories.join(", "),
        step: steps.map((text, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text,
        })),
        ...(useCase.authorHandle
          ? {
              author: {
                "@type": "Person",
                name: useCase.authorHandle,
              },
            }
          : {}),
      },
      breadcrumb(path, useCase.title, "Use Cases", "/usecases"),
    ],
  }
}

function itemList(items: { name: string; path: string }[]) {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  }
}

function breadcrumb(
  path: string,
  name: string,
  parentName: string,
  parentPath: string
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "IronHub",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: parentName,
        item: absoluteUrl(parentPath),
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: absoluteUrl(path),
      },
    ],
  }
}

function extractSteps(markdown: string) {
  const steps = markdown
    .split("\n")
    .map((line) => line.match(/^\s*(?:\d+[.)]|[-*+])\s+(.+)$/)?.[1])
    .filter((line): line is string => Boolean(line))
    .map(stripMarkup)
    .filter(Boolean)

  return steps.length > 0 ? steps : [stripMarkup(markdown)]
}

function stripMarkup(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
