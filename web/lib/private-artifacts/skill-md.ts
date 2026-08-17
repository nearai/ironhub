import yaml from "js-yaml"

export type ParsedSkillMd = {
  // Full parsed YAML map, key order preserved (js-yaml/JS objects keep
  // insertion order for string keys), so unrecognized keys can be carried
  // through a save untouched.
  frontmatter: Record<string, unknown>
  // Everything after the closing `---` line, verbatim.
  body: string
}

// Matches a leading `---\n...\n---` frontmatter fence at the very start of
// the file. The closing fence must start a line; a trailing newline after it
// (if present) is consumed so `body` doesn't carry a stray leading blank line
// from the fence itself.
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

/**
 * Parses a SKILL.md file into its YAML frontmatter map and markdown body.
 *
 * This must never throw: a file with no frontmatter, or frontmatter that
 * fails to parse as a YAML mapping, is treated as having no frontmatter at
 * all (`{ frontmatter: {}, body: text }`) rather than being rejected. The bug
 * this module fixes is silent data loss, so parsing is deliberately
 * permissive -- callers decide what to do with an empty frontmatter map.
 */
export function parseSkillMd(text: string): ParsedSkillMd {
  const match = FRONTMATTER_PATTERN.exec(text)
  if (!match) {
    return { frontmatter: {}, body: text }
  }

  try {
    const parsed = yaml.load(match[1])
    const frontmatter =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    return { frontmatter, body: text.slice(match[0].length) }
  } catch {
    return { frontmatter: {}, body: text }
  }
}

/**
 * Serializes a frontmatter map and body back into SKILL.md text. Writes back
 * the whole frontmatter map, so any key a caller did not touch is preserved
 * exactly as parsed -- this is what makes the parse -> edit -> serialize
 * round trip lossless for unknown keys.
 *
 * `body` is expected to be exactly what `parseSkillMd` returned (including
 * its leading blank-line separator, if the source had one) -- only one `\n`
 * is placed after the closing fence so `parseSkillMd(serializeSkillMd(fm,
 * body)).body === body` holds.
 */
export function serializeSkillMd(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const hasKeys = Object.keys(frontmatter).length > 0
  const yamlBlock = hasKeys
    ? yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd()
    : ""

  return `---\n${yamlBlock}\n---\n${body}`
}
