import { promises as fs } from "node:fs"
import path from "node:path"
import type { SkillCatalogItem, ToolCatalogItem } from "@/lib/catalog/types"
import {
  extractLimits,
  extractSkillLimits,
  inferCategory,
  inferIcon,
  inferToolTags,
  titleize,
} from "@/lib/catalog/inference"
import {
  countRustEnumVariants,
  parseSkillFrontmatter,
  parseTrackingTable,
  parseToolValueMetadata,
  readCargoValue,
} from "@/lib/catalog/parsers"
import type {
  CapabilityManifest,
  TrackingRow,
} from "@/lib/catalog/source-types"
import { links, sourceLink } from "@/lib/shared/links"

export async function findRepoRoot() {
  const configuredRoot = process.env.IRONHUB_REPO_ROOT

  if (configuredRoot) {
    return path.resolve(configuredRoot)
  }

  let current = process.cwd()

  for (let index = 0; index < 6; index += 1) {
    if (
      (await exists(path.join(current, "tools"))) &&
      (await exists(path.join(current, "skills")))
    ) {
      return current
    }

    current = path.dirname(current)
  }

  return path.resolve(process.cwd(), "..")
}

export async function readTracking(root: string) {
  const text = await readText(path.join(root, "tracking.md"))
  return {
    tools: parseTrackingTable(text, "Tools"),
    skills: parseTrackingTable(text, "Skills"),
  }
}

export async function readTools(
  root: string,
  tracking: Map<string, TrackingRow>
) {
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
          ? (JSON.parse(await readText(manifestPath)) as CapabilityManifest)
          : {}
        const cargo = await readText(path.join(toolRoot, "Cargo.toml"))
        const readme = await readText(path.join(toolRoot, "README.md"))
        const readmeMetadata = parseToolValueMetadata(readme)
        const row = tracking.get(slug)
        const actionCount = countRustEnumVariants(
          await readText(path.join(toolRoot, "src/types.rs"))
        )
        const authModel = manifest.auth?.oauth
          ? `OAuth 2.0 user-context${slug === "microsoft-365" ? " with PKCE" : ""}`
          : "No auth"

        const description = readmeMetadata.description?.trim() || null

        const tags = inferToolTags(slug, manifest, readme)

        const useCases = readmeMetadata.useCases ?? []

        const valueTags = readmeMetadata.valueTags ?? []

        const body = (readme.split(/^---\n[\s\S]*?\n---/m)[1] ?? readme)
          .replace(/^# .*\n/, "") // Strip title if it's the first line
          .trim()

        return {
          slug,
          kind: "tool",
          name: titleize(slug),
          status: row?.status ?? "live",
          version:
            row?.version ??
            readmeMetadata.version ??
            manifest.version ??
            readCargoValue(cargo, "version") ??
            "0.0.0",
          description,
          category: inferCategory(
            slug,
            `${manifest.description ?? ""} ${readme}`
          ),
          tags,
          useCases,
          valueTags,
          body,
          author: row?.author ?? "unknown",
          sourcePath: `tools/${slug}`,
          links: {
            source: sourceLink(`tools/${slug}`),
            setup: sourceLink(`tools/${slug}/README.md`),
            docs: manifestPath
              ? sourceLink(path.relative(root, manifestPath))
              : undefined,
          },
          metrics: { actions: actionCount },
          auth: {
            model: authModel,
            requiredSecrets:
              manifest.secrets?.allowed_names ??
              Object.keys(manifest.http?.credentials ?? {}),
          },
          limits: row?.limits?.length ? row.limits : extractLimits(readme),
          related: {},
          icon: inferIcon(slug),
          actionCount,
          witVersion: manifest.wit_version ?? "unknown",
          httpAllowlist:
            manifest.http?.allowlist?.flatMap((entry) =>
              entry.host ? [entry.host] : []
            ) ?? [],
          requiredSecrets: manifest.secrets?.allowed_names ?? [],
        }
      })
  )
}

export async function readSkills(
  root: string,
  tracking: Map<string, TrackingRow>
) {
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

        const description = frontmatter.description?.trim() || null
        const tags = ["Skill", ...frontmatter.tags]

        const useCases = frontmatter.useCases ?? []

        const valueTags = frontmatter.valueTags ?? []

        const body = text.split(/^---\n[\s\S]*?\n---/m)[1]?.trim() ?? ""

        return {
          slug,
          kind: "skill",
          name: titleize(frontmatter.name ?? slug),
          status: row?.status ?? "live",
          version: row?.version ?? frontmatter.version ?? "1.0.0",
          description,
          category: inferCategory(
            slug,
            `${frontmatter.tags.join(" ")} ${frontmatter.description ?? ""}`
          ),
          tags,
          useCases,
          valueTags,
          body,
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

async function findFirst(dir: string, suffix: string) {
  const entries = await safeReadDir(dir)
  const entry = entries.find(
    (candidate) => candidate.isFile() && candidate.name.endsWith(suffix)
  )
  return entry ? path.join(dir, entry.name) : undefined
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
