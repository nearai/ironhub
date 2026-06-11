import { promises as fs } from "fs"
import path from "path"
import {
  USE_CASE_CATEGORIES,
  type SkillReference,
  type UseCase,
  type UsecaseCategory,
} from "./types"

const USE_CASE_FILE = "USE_CASE.md"
const SECTION_HEADINGS = [
  "1. Title",
  "2. Example prompt",
  "3. What the agent does",
  "4. Skills & tools used",
  "5. Categories",
  "6. Source (optional)",
  "7. Author (optional)",
] as const

function cleanOptionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed === "_No response_" ? "" : trimmed
}

function parseTemplateSections(markdown: string, filePath: string) {
  const sections = new Map<(typeof SECTION_HEADINGS)[number], string>()
  const lines = markdown.split("\n")
  let current: (typeof SECTION_HEADINGS)[number] | null = null
  let buffer: string[] = []

  function flush() {
    if (current) sections.set(current, buffer.join("\n").trim())
    buffer = []
  }

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+)$/)?.[1]?.trim()

    if (heading) {
      if (!SECTION_HEADINGS.includes(heading as (typeof SECTION_HEADINGS)[number])) {
        throw new Error(`Unexpected use case heading "${heading}" in ${filePath}`)
      }

      flush()
      current = heading as (typeof SECTION_HEADINGS)[number]
      continue
    }

    if (current) buffer.push(line)
  }

  flush()

  for (const heading of SECTION_HEADINGS) {
    if (!sections.has(heading)) {
      throw new Error(`Missing use case section "${heading}" in ${filePath}`)
    }
  }

  return sections
}

function requiredSection(
  sections: Map<(typeof SECTION_HEADINGS)[number], string>,
  heading: (typeof SECTION_HEADINGS)[number],
  filePath: string
) {
  const value = sections.get(heading)?.trim() ?? ""

  if (!value || value === "_No response_") {
    throw new Error(`Missing required use case value "${heading}" in ${filePath}`)
  }

  return value
}

function parseCategories(value: string, filePath: string): UsecaseCategory[] {
  const lines = value.split("\n").filter((line) => line.trim())

  if (lines.length !== USE_CASE_CATEGORIES.length) {
    throw new Error(`Use case categories must match the template in ${filePath}`)
  }

  const selected = lines
    .map((line, index) => {
      const match = line.match(/^-\s+\[([ xX])\]\s+(.+)$/)
      const expected = USE_CASE_CATEGORIES[index]

      if (!match || match[2] !== expected) {
        throw new Error(`Invalid use case category row in ${filePath}: ${line}`)
      }

      return match[1].toLowerCase() === "x" ? expected : null
    })
    .filter((category): category is UsecaseCategory => category !== null)

  if (selected.length === 0) {
    throw new Error(`At least one use case category is required in ${filePath}`)
  }

  return selected
}

function parseSkill(line: string, filePath: string): SkillReference {
  const match = line.match(/^-\s+(.+?)\s+\u2014\s+(.+)$/)

  if (!match) {
    throw new Error(`Invalid skill row in ${filePath}: ${line}`)
  }

  const rawName = match[1].trim()
  const markdownLink = rawName.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  const name = (markdownLink ? markdownLink[1] : rawName)
    .replace(/\s+\(new\)$/i, "")
    .trim()

  if (!name) {
    throw new Error(`Missing skill name in ${filePath}: ${line}`)
  }

  return {
    name,
    ...(markdownLink ? { url: markdownLink[2] } : {}),
    isNew: /\(new\)$/i.test(rawName),
  }
}

function parseSkills(value: string, filePath: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    throw new Error(`Missing skills in ${filePath}`)
  }

  return lines.map((line) => parseSkill(line, filePath))
}

function parseOptionalUrl(value: string) {
  const cleaned = cleanOptionalValue(value)
  return /^https?:\/\//.test(cleaned) ? cleaned : undefined
}

async function getUseCasesRoot() {
  const candidates = [
    path.join(process.cwd(), "use-cases"),
    path.join(process.cwd(), "..", "use-cases"),
  ]

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate)
      if (stats.isDirectory()) return candidate
    } catch {
      // Try the next candidate.
    }
  }

  return candidates[0]
}

async function getUseCaseFiles() {
  const root = await getUseCasesRoot()
  const entries = await fs.readdir(root, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, USE_CASE_FILE))
}

async function readUseCase(filePath: string): Promise<UseCase> {
  const markdown = await fs.readFile(filePath, "utf8")
  const sections = parseTemplateSections(markdown, filePath)
  const sourceUrl = parseOptionalUrl(sections.get("6. Source (optional)") ?? "")
  const authorHandle = cleanOptionalValue(
    sections.get("7. Author (optional)") ?? ""
  )

  return {
    id: path.basename(path.dirname(filePath)),
    title: requiredSection(sections, "1. Title", filePath),
    examplePrompt: requiredSection(sections, "2. Example prompt", filePath),
    agentDoes: requiredSection(sections, "3. What the agent does", filePath),
    skillsAndTools: parseSkills(
      requiredSection(sections, "4. Skills & tools used", filePath),
      filePath
    ),
    categories: parseCategories(
      requiredSection(sections, "5. Categories", filePath),
      filePath
    ),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(authorHandle ? { authorHandle } : {}),
  }
}

export async function getUseCases(): Promise<UseCase[]> {
  const files = await getUseCaseFiles()
  const useCases = await Promise.all(files.map(readUseCase))

  return useCases.sort((a, b) => a.title.localeCompare(b.title))
}

export async function getUsecaseCategories() {
  return [...USE_CASE_CATEGORIES]
}
