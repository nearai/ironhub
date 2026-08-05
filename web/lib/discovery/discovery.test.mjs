import assert from "node:assert/strict"
import test from "node:test"

import { serializeJsonLd } from "./json-ld.ts"
import {
  markdownResponse,
  renderCatalogItemMarkdown,
  renderLlmsTxt,
  renderUseCaseMarkdown,
} from "./markdown.ts"
import { buildPublicMetadata } from "./metadata.ts"
import { absoluteUrl, resolveSiteUrl, siteConfig } from "./site.ts"

test("uses the extension hub positioning as the default identity", () => {
  assert.equal(siteConfig.tagline, "The Extension Hub for IronClaw")
  assert.equal(siteConfig.defaultTitle, "IronHub — The Extension Hub for IronClaw")
  assert.doesNotMatch(siteConfig.defaultTitle, /secure skills/i)
  assert.match(renderLlmsTxt(), /IronHub is the extension hub for IronClaw/)
})

test("normalizes configured origins and falls back for invalid values", () => {
  assert.equal(resolveSiteUrl("https://example.com/path").toString(), "https://example.com/")
  assert.equal(resolveSiteUrl("javascript:alert(1)").toString(), "https://hub.ironclaw.com/")
})

test("constructs absolute same-site URLs", () => {
  assert.equal(
    absoluteUrl("/marketplace/demo", new URL("https://example.com")),
    "https://example.com/marketplace/demo"
  )
})

test("builds canonical and Markdown alternate metadata", () => {
  const metadata = buildPublicMetadata({
    title: "Demo Skill",
    description: "A demo skill.",
    path: "/marketplace/demo",
    markdownPath: "/marketplace/demo.md",
  })

  assert.equal(metadata.alternates.canonical, "https://hub.ironclaw.com/marketplace/demo")
  assert.equal(
    metadata.alternates.types["text/markdown"],
    "https://hub.ironclaw.com/marketplace/demo.md"
  )
})

test("escapes script-breaking characters in JSON-LD", () => {
  const output = serializeJsonLd({ name: "</script><script>alert(1)</script>" })

  assert.equal(output.includes("</script>"), false)
  assert.match(output, /\\u003c\/script>/)
})

test("renders catalog and use-case Markdown from public records", () => {
  const catalogMarkdown = renderCatalogItemMarkdown({
    slug: "demo",
    kind: "skill",
    name: "Demo Skill",
    description: "Runs a demo.",
    version: "1.0.0",
    author: "IronHub",
    category: "Automation",
    status: "live",
    tags: ["Skill"],
    useCases: ["Run demos"],
    limits: [],
    body: "See [guide](guide.md).",
    links: {
      source: "https://github.com/nearai/ironhub/blob/main/skills/demo/SKILL.md",
      docs: "https://github.com/nearai/ironhub/blob/main/skills/demo/SKILL.md",
    },
  })
  const useCaseMarkdown = renderUseCaseMarkdown({
    id: "demo-workflow",
    title: "Demo workflow",
    examplePrompt: "Run the demo",
    agentDoes: "1. Load the [guide](/docs).",
    categories: ["Automation"],
    skillsAndTools: [{ name: "Demo Skill" }],
  })

  assert.match(catalogMarkdown, /canonical: "https:\/\/hub\.ironclaw\.com\/marketplace\/demo"/)
  assert.match(catalogMarkdown, /https:\/\/github\.com\/nearai\/ironhub\/blob\/main\/skills\/demo\/guide\.md/)
  assert.match(useCaseMarkdown, /https:\/\/hub\.ironclaw\.com\/docs/)
})

test("Markdown responses identify content type and HTML canonical", async () => {
  const response = markdownResponse("# Demo\n", "/usecases/demo")

  assert.match(response.headers.get("content-type"), /^text\/markdown/)
  assert.equal(
    response.headers.get("link"),
    '<https://hub.ironclaw.com/usecases/demo>; rel="canonical"'
  )
  assert.equal(await response.text(), "# Demo\n")
})
