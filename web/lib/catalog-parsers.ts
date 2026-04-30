import type { CatalogStatus } from "@/lib/catalog-types"
import type { SkillFrontmatter, TrackingRow } from "@/lib/catalog-source-types"

export function parseTrackingTable(text: string, heading: "Tools" | "Skills") {
  const section = text.split(`## ${heading}`)[1]?.split("\n## ")[0] ?? ""
  const rows = new Map<string, TrackingRow>()

  for (const line of section.split("\n")) {
    if (!line.startsWith("| `")) {
      continue
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())
    const name = cells[0]?.replaceAll("`", "")

    if (!name) {
      continue
    }

    if (heading === "Tools") {
      rows.set(name, {
        status: normalizeStatus(cells[1]),
        version: cells[2],
        description: cells[3],
        limits: splitLimits(cells[4]),
        author: cells[5],
      })
    } else {
      rows.set(name, {
        trunk: cells[1]?.replaceAll("`", ""),
        status: normalizeStatus(cells[2]),
        version: cells[3],
        description: cells[4],
        author: cells[5],
      })
    }
  }

  return rows
}

export function parseSkillFrontmatter(text: string): SkillFrontmatter {
  const yaml = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ""

  return {
    name: readYamlScalar(yaml, "name"),
    version: readYamlScalar(yaml, "version"),
    description: readYamlScalar(yaml, "description"),
    tags: readYamlList(yaml, "tags"),
    keywords: readYamlList(yaml, "keywords"),
    patterns: readYamlList(yaml, "patterns"),
    maxContextTokens: Number(readYamlScalar(yaml, "max_context_tokens") ?? 0),
  }
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

function normalizeStatus(value?: string): CatalogStatus {
  if (value === "proposed" || value === "in-progress" || value === "blocked") {
    return value
  }

  return "live"
}

function splitLimits(value?: string) {
  return (
    value
      ?.split(". ")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  )
}
