#!/usr/bin/env node

import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"

const ROOT = process.cwd()
const USE_CASES_DIR = path.join(ROOT, "use-cases")
const USE_CASE_FILE = "USE_CASE.md"

const SECTION_HEADINGS = [
  "1. Title",
  "2. Example prompt",
  "3. What the agent does",
  "4. Skills & tools used",
  "5. Categories",
  "6. Source (optional)",
  "7. Author (optional)",
]

const CATEGORIES = [
  "Personal assistant",
  "Web 3 / Crypto",
  "Coding / dev workflow",
  "Research",
  "Marketing / content",
  "Business ops",
  "Sales / CRM",
  "Files / knowledge",
  "Automation",
  "Design / media",
  "Skill creation",
]

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 96)
    .replace(/-+$/g, "") || "use-case"
}

function fail(errors, filePath, message) {
  errors.push(`${path.relative(ROOT, filePath)}: ${message}`)
}

function parseSections(markdown, filePath, errors) {
  const headingMatches = [...markdown.matchAll(/^###\s+(.+)$/gm)]
  const headings = headingMatches.map((match) => match[1].trim())

  if (headings.length !== SECTION_HEADINGS.length) {
    fail(errors, filePath, `expected ${SECTION_HEADINGS.length} sections, found ${headings.length}`)
  }

  SECTION_HEADINGS.forEach((heading, index) => {
    if (headings[index] !== heading) {
      fail(errors, filePath, `section ${index + 1} must be "### ${heading}"`)
    }
  })

  const sections = new Map()

  for (let index = 0; index < headingMatches.length; index += 1) {
    const heading = headingMatches[index][1].trim()
    const start = headingMatches[index].index + headingMatches[index][0].length
    const end = headingMatches[index + 1]?.index ?? markdown.length
    sections.set(heading, markdown.slice(start, end).trim())
  }

  return sections
}

function requiredSection(sections, heading, filePath, errors) {
  const value = sections.get(heading)?.trim() ?? ""

  if (!value || value === "_No response_") {
    fail(errors, filePath, `"${heading}" is required`)
  }

  return value
}

function validateSkills(value, filePath, errors) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    fail(errors, filePath, "at least one skill/tool row is required")
    return
  }

  for (const line of lines) {
    if (!/^-\s+.+?\s+—\s+.+$/.test(line)) {
      fail(errors, filePath, `skill/tool rows must use "- name — description": ${line}`)
    }
  }
}

function validateCategories(value, filePath, errors) {
  const lines = value.split("\n").filter((line) => line.trim())

  if (lines.length !== CATEGORIES.length) {
    fail(errors, filePath, `category checklist must have exactly ${CATEGORIES.length} rows`)
    return
  }

  let selected = 0

  lines.forEach((line, index) => {
    const match = line.match(/^-\s+\[([ xX])\]\s+(.+)$/)
    const expected = CATEGORIES[index]

    if (!match || match[2] !== expected) {
      fail(errors, filePath, `category row ${index + 1} must be "- [ ] ${expected}" or "- [x] ${expected}"`)
      return
    }

    if (match[1].toLowerCase() === "x") selected += 1
  })

  if (selected === 0) {
    fail(errors, filePath, "at least one category must be checked")
  }
}

async function main() {
  const errors = []
  const entries = await fs.readdir(USE_CASES_DIR, { withFileTypes: true })
  const useCases = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const filePath = path.join(USE_CASES_DIR, entry.name, USE_CASE_FILE)

    try {
      const markdown = await fs.readFile(filePath, "utf8")
      const sections = parseSections(markdown, filePath, errors)
      const title = requiredSection(sections, "1. Title", filePath, errors)

      requiredSection(sections, "2. Example prompt", filePath, errors)
      requiredSection(sections, "3. What the agent does", filePath, errors)
      validateSkills(requiredSection(sections, "4. Skills & tools used", filePath, errors), filePath, errors)
      validateCategories(requiredSection(sections, "5. Categories", filePath, errors), filePath, errors)

      useCases.push({ dir: entry.name, expectedSlug: slugify(title), filePath })
    } catch (error) {
      fail(errors, filePath, error instanceof Error ? error.message : String(error))
    }
  }

  const groupedBySlug = new Map()

  for (const useCase of useCases) {
    const group = groupedBySlug.get(useCase.expectedSlug) ?? []
    group.push(useCase)
    groupedBySlug.set(useCase.expectedSlug, group)
  }

  for (const [expectedSlug, group] of groupedBySlug.entries()) {
    if (group.length === 1 && group[0].dir !== expectedSlug) {
      fail(errors, group[0].filePath, `directory must be "${expectedSlug}"`)
    }

    if (group.length > 1) {
      const hasBaseSlug = group.some((useCase) => useCase.dir === expectedSlug)
      if (!hasBaseSlug) {
        fail(errors, group[0].filePath, `duplicate title group must include base directory "${expectedSlug}"`)
      }

      for (const useCase of group) {
        if (useCase.dir !== expectedSlug && !new RegExp(`^${expectedSlug}-\\d+$`).test(useCase.dir)) {
          fail(errors, useCase.filePath, `duplicate title directory must be "${expectedSlug}" or "${expectedSlug}-[issue-number]"`)
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Use case validation failed with ${errors.length} error(s):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`Validated ${useCases.length} use case(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
