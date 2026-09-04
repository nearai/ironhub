import { FAILSAFE_SCHEMA, load } from "js-yaml"

import type { SkillFrontmatter } from "@/lib/catalog/source-types"

export function parseYamlFrontmatter(text: string) {
  const { document, yaml } = parseFrontmatterDocument(text)
  const activation = readYamlRecord(document.activation)

  return {
    name: readYamlScalar(document.name),
    version: readYamlScalar(document.version),
    description: readYamlScalar(document.description),
    author: readYamlScalar(document.author),
    trunk: readYamlScalar(document.trunk),
    tags: readYamlList(document.tags ?? activation.tags),
    useCases: readYamlList(document.use_cases),
    valueTags: readYamlList(document.value_tags),
    valueProp: readYamlScalar(document.value_prop),
    activation,
    yaml,
  }
}

export function parseSkillFrontmatter(text: string): SkillFrontmatter {
  const {
    name,
    version,
    description,
    author,
    trunk,
    tags,
    useCases,
    valueTags,
    activation,
  } = parseYamlFrontmatter(text)

  return {
    name,
    version,
    description,
    author,
    trunk,
    tags,
    keywords: readYamlList(activation.keywords),
    patterns: readYamlList(activation.patterns),
    maxContextTokens: Number(
      readYamlScalar(activation.max_context_tokens) ?? 0
    ),
    useCases,
    valueTags,
  }
}

export function parseToolValueMetadata(text: string) {
  const { name, version, description, author, useCases, valueTags } =
    parseYamlFrontmatter(text)
  return { name, version, description, author, useCases, valueTags }
}

export function countRustEnumVariants(source: string) {
  const enumBody =
    source.match(/pub enum \w+Action \{([\s\S]*?)\n\}/)?.[1] ?? ""
  return enumBody
    .split("\n")
    .filter((line) => /^\s{4}[A-Z][A-Za-z0-9]+(?:\s*\{|,)/.test(line)).length
}

export function readCargoValue(cargo: string, key: string) {
  return cargo.match(new RegExp(`^${key}\\s*=\\s*"(.+)"$`, "m"))?.[1]
}

type YamlRecord = Record<string, unknown>

function parseFrontmatterDocument(text: string) {
  const yaml = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? ""

  try {
    return {
      document: readYamlRecord(load(yaml, { schema: FAILSAFE_SCHEMA })),
      yaml,
    }
  } catch {
    return { document: {}, yaml }
  }
}

function readYamlRecord(value: unknown): YamlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as YamlRecord)
    : {}
}

function readYamlScalar(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function readYamlList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
