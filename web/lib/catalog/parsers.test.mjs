import assert from "node:assert/strict"
import test from "node:test"

import {
  parseSkillFrontmatter,
  parseToolValueMetadata,
  parseYamlFrontmatter,
} from "./parsers.ts"

test("parses folded descriptions and nested skill activation metadata", () => {
  const metadata = parseSkillFrontmatter(`---
name: trading-skill
version: 1.0.0
description: >-
  Trades assets using current market data
  and declared risk limits.
activation:
  keywords:
    - "market data"
  patterns:
    - "(?i)trade"
  tags:
    - trading
  max_context_tokens: 3000
---

# Trading skill
`)

  assert.deepEqual(metadata, {
    name: "trading-skill",
    version: "1.0.0",
    description:
      "Trades assets using current market data and declared risk limits.",
    author: undefined,
    trunk: undefined,
    tags: ["trading"],
    keywords: ["market data"],
    patterns: ["(?i)trade"],
    maxContextTokens: 3000,
    useCases: [],
    valueTags: [],
  })
})

test("parses shared tool metadata through YAML semantics", () => {
  const metadata = parseToolValueMetadata(`---
name: example-tool
description: |
  First line.
  Second line.
use_cases:
  - "Read quoted values"
value_tags: [Research, Automation]
---
`)

  assert.deepEqual(metadata, {
    name: "example-tool",
    version: undefined,
    description: "First line.\nSecond line.\n",
    author: undefined,
    useCases: ["Read quoted values"],
    valueTags: ["Research", "Automation"],
  })
})

test("returns empty metadata for invalid or missing frontmatter", () => {
  assert.deepEqual(parseYamlFrontmatter("# No frontmatter"), {
    name: undefined,
    version: undefined,
    description: undefined,
    author: undefined,
    trunk: undefined,
    tags: [],
    useCases: [],
    valueTags: [],
    valueProp: undefined,
    activation: {},
    yaml: "",
  })

  assert.equal(
    parseYamlFrontmatter("---\ndescription: [broken\n---\n").description,
    undefined
  )
})
