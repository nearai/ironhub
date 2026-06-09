import type { CatalogStatus } from "@/lib/catalog/types"
import type { SkillFrontmatter } from "@/lib/catalog/source-types"

export function parseYamlFrontmatter(text: string) {
  const yaml = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ""

  return {
    name: readYamlScalar(yaml, "name"),
    version: readYamlScalar(yaml, "version"),
    description: readYamlScalar(yaml, "description"),
    author: readYamlScalar(yaml, "author"),
    trunk: readYamlScalar(yaml, "trunk"),
    tags: readYamlList(yaml, "tags"),
    useCases: readYamlList(yaml, "use_cases"),
    valueTags: readYamlList(yaml, "value_tags"),
    valueProp: readYamlScalar(yaml, "value_prop"),
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
    yaml,
  } =
    parseYamlFrontmatter(text)

  return {
    name,
    version,
    description,
    author,
    trunk,
    tags,
    keywords: readYamlList(yaml, "keywords"),
    patterns: readYamlList(yaml, "patterns"),
    maxContextTokens: Number(readYamlScalar(yaml, "max_context_tokens") ?? 0),
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

function readYamlScalar(yaml: string, key: string) {
  return yaml
    .match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]
    ?.replace(/^["']|["']$/g, "")
}

function readYamlList(yaml: string, key: string) {
  const lines = yaml.split("\n")
  const start = lines.findIndex((line) => line.trim() === `${key}:`)

  if (start === -1) {
    return []
  }

  const values: string[] = []
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    if (!trimmed.startsWith("- ")) {
      break
    }

    values.push(trimmed.slice(2).replace(/^["']|["']$/g, ""))
  }

  return values
}
