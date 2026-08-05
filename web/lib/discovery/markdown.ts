import type { CollectionBundle } from "@/lib/catalog/collections"
import type { CatalogItem } from "@/lib/catalog/types"
import type { UseCase } from "@/lib/usecases/types"

import { absoluteUrl, siteConfig } from "./site.ts"

const MARKDOWN_CACHE = "public, max-age=300, stale-while-revalidate=86400"

export function renderCatalogItemMarkdown(item: CatalogItem) {
  const path = `/marketplace/${item.slug}`
  const markdownPath = `${path}.md`
  const body = absolutizeMarkdown(
    item.body || item.description || "No description provided.",
    item.links.docs || item.links.source || absoluteUrl(`${path}/`),
    item.origin === "iliad"
      ? absoluteUrl(`${path}/`)
      : absoluteUrl(`/api/catalog/repository-asset/${item.kind}/${item.slug}/`)
  )

  return `${frontmatter({
    title: item.name,
    description: item.description || "",
    canonical: absoluteUrl(path),
    markdown: absoluteUrl(markdownPath),
    type: item.kind,
    version: item.version,
    author: item.author,
    category: item.category,
    tags: item.tags,
  })}
# ${item.name}

${item.description ? `> ${item.description}\n` : ""}
## Details

- **Type:** ${titleCase(item.kind)}
- **Version:** ${item.version}
- **Author:** ${item.author}
- **Category:** ${item.category}
- **Status:** ${item.status}
${item.tags.length ? `- **Tags:** ${item.tags.join(", ")}\n` : ""}
${section("Use Cases", item.useCases)}${section("Limits", item.limits)}
## Documentation

${body}

## Links

- [HTML page](${absoluteUrl(path)})
- [Source](${item.links.source})
${item.links.docs ? `- [Documentation](${item.links.docs})\n` : ""}`
}

export function renderUseCaseMarkdown(useCase: UseCase) {
  const path = `/usecases/${useCase.id}`
  const workflow = absolutizeMarkdown(
    useCase.agentDoes,
    absoluteUrl(`${path}/`),
    absoluteUrl(`${path}/`)
  )
  const skills = useCase.skillsAndTools
    .filter((skill) => skill.name.trim())
    .map((skill) => {
      const url = skill.url ? resolveLink(skill.url, absoluteUrl(path)) : null
      return `- ${url ? `[${skill.name}](${url})` : skill.name}${
        skill.isNew ? " _(new)_" : ""
      }`
    })
    .join("\n")

  return `${frontmatter({
    title: useCase.title,
    description: useCase.examplePrompt,
    canonical: absoluteUrl(path),
    markdown: absoluteUrl(`${path}.md`),
    type: "use-case",
    categories: useCase.categories,
    author: useCase.authorHandle || "IronHub community",
  })}
# ${useCase.title}

## Example Prompt

> ${useCase.examplePrompt.replace(/\n/g, "\n> ")}

## What the Agent Does

${workflow}

## Skills and Tools

${skills || "- No specific skills or tools listed."}

## Categories

${useCase.categories.map((category) => `- ${category}`).join("\n")}

## Links

- [HTML page](${absoluteUrl(path)})
${useCase.sourceUrl ? `- [Source](${useCase.sourceUrl})\n` : ""}
`
}

export function renderCollectionMarkdown(collection: CollectionBundle) {
  const path = `/collections/${collection.slug}`

  return `${frontmatter({
    title: collection.title,
    description: collection.outcome,
    canonical: absoluteUrl(path),
    markdown: absoluteUrl(`${path}.md`),
    type: "collection",
    entries: collection.items.length,
  })}
# ${collection.title}

> ${collection.summary}

## Outcome

${collection.outcome}

## Included Skills and Tools

${collection.items
  .map(
    (item) =>
      `- [${item.name}](${absoluteUrl(`/marketplace/${item.slug}.md`)}) — ${
        item.description || titleCase(item.kind)
      }`
  )
  .join("\n")}

## Links

- [HTML page](${absoluteUrl(path)})
- [Marketplace index](${absoluteUrl("/marketplace.md")})
`
}

export function renderMarketplaceIndexMarkdown(items: CatalogItem[]) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))

  return `${frontmatter({
    title: "IronHub Marketplace",
    description:
      "Repo-backed IronClaw skills, WebAssembly tools, and public community skills.",
    canonical: absoluteUrl("/marketplace"),
    markdown: absoluteUrl("/marketplace.md"),
    entries: sorted.length,
  })}
# IronHub Marketplace

> Browse public IronClaw skills and WebAssembly tools. Follow a Markdown link for the complete entry.

${["tool", "skill"]
  .map((kind) => {
    const entries = sorted.filter((item) => item.kind === kind)
    if (!entries.length) return ""
    return `## ${titleCase(kind)}s\n\n${entries
      .map(
        (item) =>
          `- [${item.name}](${absoluteUrl(`/marketplace/${item.slug}.md`)}) — ${
            item.description || "No description provided."
          }`
      )
      .join("\n")}`
  })
  .filter(Boolean)
  .join("\n\n")}
`
}

export function renderUseCasesIndexMarkdown(useCases: UseCase[]) {
  const sorted = [...useCases].sort((a, b) => a.title.localeCompare(b.title))

  return `${frontmatter({
    title: "IronClaw Use Cases",
    description:
      "Community-built IronClaw workflows, automations, and agent configurations.",
    canonical: absoluteUrl("/usecases"),
    markdown: absoluteUrl("/usecases.md"),
    entries: sorted.length,
  })}
# IronClaw Use Cases

> Explore public workflows and the skills and tools used to build them.

${sorted
  .map(
    (useCase) =>
      `- [${useCase.title}](${absoluteUrl(`/usecases/${useCase.id}.md`)}) — ${
        useCase.examplePrompt
      }`
  )
  .join("\n")}
`
}

export function renderLlmsTxt() {
  return `# ${siteConfig.name}

> ${siteConfig.description}

IronHub is ${siteConfig.tagline.replace("The Extension Hub", "the extension hub")}: a home for skills, WebAssembly tools, curated collections, and community use cases. HTML pages are canonical; linked Markdown documents provide concise agent-readable representations.

## Content

- [Marketplace index](${absoluteUrl("/marketplace.md")}): All public tools and skills with links to per-entry Markdown.
- [Use-case index](${absoluteUrl("/usecases.md")}): Public workflows with links to per-use-case Markdown.
- [Catalog manifest](${absoluteUrl("/api/catalog/manifest.json")}): Signed machine-readable installation catalog.
- [Documentation](${absoluteUrl("/docs")}): Repository and contribution documentation.

## Project

- [IronHub website](${absoluteUrl("/")})
- [Source repository](${siteConfig.repository})
- [IronClaw documentation](https://docs.ironclaw.com/)

## URL Conventions

- Append \`.md\` to a marketplace item, use case, or collection URL for its Markdown representation.
- Prefer the HTML URL as the canonical citation and the Markdown URL when compact machine-readable context is useful.
`
}

export function markdownResponse(markdown: string, canonicalPath: string) {
  return new Response(markdown, {
    headers: {
      "Cache-Control": MARKDOWN_CACHE,
      "Content-Language": "en",
      "Content-Type": "text/markdown; charset=utf-8",
      Link: `<${absoluteUrl(canonicalPath)}>; rel="canonical"`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}

export function markdownNotFound() {
  return new Response("# Not Found\n", {
    status: 404,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function frontmatter(fields: Record<string, string | number | string[]>) {
  const rows = Object.entries(fields).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`
  )
  return `---\n${rows.join("\n")}\n---\n`
}

function section(title: string, values: string[]) {
  if (!values.length) return ""
  return `\n## ${title}\n\n${values.map((value) => `- ${value}`).join("\n")}\n`
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function absolutizeMarkdown(
  markdown: string,
  linkBase: string,
  imageBase: string
) {
  return markdown
    .split(/(```[\s\S]*?```)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part

      return part
        .replace(
          /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,
          (_match, src: string) => `![Image](${resolveLink(src, imageBase)})`
        )
        .replace(
          /(!?\[[^\]]*\]\()([^\s)]+)([^)]*\))/g,
          (_match, prefix: string, target: string, suffix: string) => {
            const base = prefix.startsWith("!") ? imageBase : linkBase
            return `${prefix}${resolveLink(target, base)}${suffix}`
          }
        )
    })
    .join("")
}

function resolveLink(value: string, base: string) {
  if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(value)) return value

  try {
    return new URL(value, base).toString()
  } catch {
    return value
  }
}
