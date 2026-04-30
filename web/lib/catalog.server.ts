import { promises as fs } from "node:fs"
import path from "node:path"
import type {
  CatalogItem,
  CatalogStatus,
  SkillCatalogItem,
  ToolCatalogItem,
} from "@/lib/catalog-types"
import { links, sourceLink } from "@/lib/links"

type TrackingRow = {
  status?: CatalogStatus
  version?: string
  description?: string
  limits?: string[]
  author?: string
  trunk?: string
}

type CapabilityManifest = {
  version?: string
  wit_version?: string
  description?: string
  http?: {
    allowlist?: Array<{ host?: string }>
    credentials?: Record<string, unknown>
  }
  secrets?: {
    allowed_names?: string[]
  }
  auth?: {
    display_name?: string
    oauth?: unknown
  }
}

export async function getCatalog() {
  const root = await findRepoRoot()
  const tracking = await readTracking(root)
  const [tools, skills] = await Promise.all([
    readTools(root, tracking.tools),
    readSkills(root, tracking.skills),
  ])
  const items = [...tools, ...skills].sort((a, b) => a.name.localeCompare(b.name))
  const branchMap = new Map<string, string[]>()

  for (const item of items) {
    if (item.kind === "skill") {
      branchMap.set(item.trunk, [...(branchMap.get(item.trunk) ?? []), item.slug])
    }
  }

  return items.map((item) => {
    if (item.kind === "tool") {
      return { ...item, related: { ...item.related, branches: branchMap.get(item.slug) ?? [] } }
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

async function findRepoRoot() {
  let current = process.cwd()

  for (let index = 0; index < 6; index += 1) {
    if ((await exists(path.join(current, "tools"))) && (await exists(path.join(current, "skills")))) {
      return current
    }

    current = path.dirname(current)
  }

  return path.resolve(process.cwd(), "..")
}

async function readTracking(root: string) {
  const text = await readText(path.join(root, "tracking.md"))
  return {
    tools: parseTrackingTable(text, "Tools"),
    skills: parseTrackingTable(text, "Skills"),
  }
}

function parseTrackingTable(text: string, heading: "Tools" | "Skills") {
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

async function readTools(root: string, tracking: Map<string, TrackingRow>) {
  const toolsRoot = path.join(root, "tools")
  const entries = await safeReadDir(toolsRoot)

  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<ToolCatalogItem> => {
        const slug = entry.name
        const toolRoot = path.join(toolsRoot, slug)
        const manifestPath = await findFirst(toolRoot, ".capabilities.json")
        const manifest = manifestPath
          ? JSON.parse(await readText(manifestPath)) as CapabilityManifest
          : {}
        const cargo = await readText(path.join(toolRoot, "Cargo.toml"))
        const readme = await readText(path.join(toolRoot, "README.md"))
        const row = tracking.get(slug)
        const actionCount = countRustEnumVariants(await readText(path.join(toolRoot, "src/types.rs")))
        const authModel = manifest.auth?.oauth
          ? `OAuth 2.0 user-context${slug === "microsoft-365" ? " with PKCE" : ""}`
          : "No auth"

        return {
          slug,
          kind: "tool",
          name: titleize(slug),
          status: row?.status ?? "live",
          version: row?.version ?? manifest.version ?? readCargoValue(cargo, "version") ?? "0.0.0",
          description: row?.description ?? manifest.description ?? readCargoValue(cargo, "description") ?? "",
          category: inferCategory(slug, `${manifest.description ?? ""} ${readme}`),
          tags: inferToolTags(slug, manifest, readme),
          author: row?.author ?? "unknown",
          sourcePath: `tools/${slug}`,
          links: {
            source: sourceLink(`tools/${slug}`),
            setup: sourceLink(`tools/${slug}/README.md`),
            docs: manifestPath ? sourceLink(path.relative(root, manifestPath)) : undefined,
          },
          metrics: { actions: actionCount },
          auth: {
            model: authModel,
            requiredSecrets: manifest.secrets?.allowed_names ?? Object.keys(manifest.http?.credentials ?? {}),
          },
          limits: row?.limits?.length ? row.limits : extractLimits(readme),
          related: {},
          icon: inferIcon(slug),
          actionCount,
          witVersion: manifest.wit_version ?? "unknown",
          httpAllowlist: manifest.http?.allowlist?.flatMap((entry) => entry.host ? [entry.host] : []) ?? [],
          requiredSecrets: manifest.secrets?.allowed_names ?? [],
        }
      })
  )
}

async function readSkills(root: string, tracking: Map<string, TrackingRow>) {
  const skillsRoot = path.join(root, "skills")
  const entries = await safeReadDir(skillsRoot)

  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<SkillCatalogItem> => {
        const slug = entry.name
        const sourcePath = `skills/${slug}/SKILL.md`
        const text = await readText(path.join(root, sourcePath))
        const frontmatter = parseSkillFrontmatter(text)
        const row = tracking.get(slug)

        return {
          slug,
          kind: "skill",
          name: titleize(frontmatter.name ?? slug),
          status: row?.status ?? "live",
          version: row?.version ?? frontmatter.version ?? "1.0.0",
          description: row?.description ?? frontmatter.description ?? "",
          category: inferCategory(slug, `${frontmatter.tags.join(" ")} ${frontmatter.description ?? ""}`),
          tags: ["Skill", ...frontmatter.tags],
          author: row?.author ?? "unknown",
          sourcePath,
          links: {
            source: sourceLink(sourcePath),
            docs: sourceLink(sourcePath),
            issue: links.newSkill,
          },
          metrics: {
            keywords: frontmatter.keywords.length,
            patterns: frontmatter.patterns.length,
          },
          auth: {
            model: `Uses ${row?.trunk ?? "declared"} trunk auth`,
            requiredSecrets: [],
          },
          limits: extractSkillLimits(text),
          related: { trunk: row?.trunk },
          icon: "workflow",
          trunk: row?.trunk ?? "",
          activationKeywords: frontmatter.keywords,
          activationPatterns: frontmatter.patterns,
          maxContextTokens: frontmatter.maxContextTokens,
        }
      })
  )
}

function parseSkillFrontmatter(text: string) {
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

function readYamlScalar(yaml: string, key: string) {
  return yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.replace(/^["']|["']$/g, "")
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

function countRustEnumVariants(source: string) {
  const enumBody = source.match(/pub enum \w+Action \{([\s\S]*?)\n\}/)?.[1] ?? ""
  return enumBody
    .split("\n")
    .filter((line) => /^\s{4}[A-Z][A-Za-z0-9]+(?:\s*\{|,)/.test(line)).length
}

function readCargoValue(cargo: string, key: string) {
  return cargo.match(new RegExp(`^${key}\\s*=\\s*"(.+)"$`, "m"))?.[1]
}

function normalizeStatus(value?: string): CatalogStatus {
  if (value === "proposed" || value === "in-progress" || value === "blocked") {
    return value
  }

  return "live"
}

function splitLimits(value?: string) {
  return value?.split(". ").map((item) => item.trim()).filter(Boolean) ?? []
}

function extractLimits(text: string) {
  const limitLines = text
    .split("\n")
    .filter((line) => /limit|cap|403|rate/i.test(line))
    .map((line) => line.replace(/^[-#*\s]+/, "").trim())

  return limitLines.slice(0, 3)
}

function extractSkillLimits(text: string) {
  const section = text.split("## Do NOT Use This Skill For")[1]?.split("\n## ")[0] ?? ""
  const limits = section
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.replace(/^-\s*/, "").trim())

  return limits.slice(0, 3)
}

function inferCategory(slug: string, text: string) {
  const haystack = `${slug} ${text}`.toLowerCase()

  if (haystack.includes("near") || haystack.includes("rpc") || haystack.includes("contract")) {
    return "Development"
  }

  if (haystack.includes("microsoft") || haystack.includes("excel") || haystack.includes("teams")) {
    return "Productivity"
  }

  return "Utilities"
}

function inferToolTags(slug: string, manifest: CapabilityManifest, readme: string) {
  const tags = new Set(["WASM tool"])
  const text = `${slug} ${manifest.description ?? ""} ${readme}`.toLowerCase()

  if (text.includes("oauth")) tags.add("OAuth")
  if (text.includes("microsoft")) tags.add("Microsoft Graph")
  if (text.includes("near")) tags.add("NEAR")
  if (manifest.http?.allowlist?.length) tags.add("HTTP allowlist")
  if (!manifest.secrets?.allowed_names?.length) tags.add("No required secrets")

  return Array.from(tags)
}

function inferIcon(slug: string) {
  if (slug.includes("near")) return "near"
  if (slug.includes("microsoft")) return "microsoft"
  return "tool"
}

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

async function findFirst(dir: string, suffix: string) {
  const entries = await safeReadDir(dir)
  return entries.find((entry) => entry.isFile() && entry.name.endsWith(suffix))
    ? path.join(dir, entries.find((entry) => entry.isFile() && entry.name.endsWith(suffix))!.name)
    : undefined
}

async function readText(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8")
  } catch {
    return ""
  }
}

async function safeReadDir(dir: string) {
  try {
    return await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
