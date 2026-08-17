import yaml from "js-yaml"

// Known limitation: this module round-trips frontmatter through js-yaml's
// generic load/dump, not a comment-preserving document API. Values and key
// order survive a save; YAML comments, number formatting quirks (e.g.
// `1.0` -> `1`, `007` -> `7`), quoting/flow/block style, anchors, and merge
// keys do not -- they get normalized or dropped by `dump`. Fixing that
// would mean replacing js-yaml with a CST-preserving YAML library, which is
// a bigger change than this module makes. Do not assume comments survive.

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
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        frontmatter: parsed as Record<string, unknown>,
        body: text.slice(match[0].length),
      }
    }
    // The fence parsed as valid YAML but not as a mapping (e.g. a scalar, a
    // list, or -- the common real case -- a `---`-delimited region that
    // isn't frontmatter at all, like a thematic break followed by prose).
    // Treat this exactly like the parse-failure branch below: there is no
    // frontmatter to extract, so the *whole* original text is the body.
    // Slicing off the matched fence here would silently delete real content
    // (see skill-md.test.mjs) -- the one bug this module exists to prevent.
    return { frontmatter: {}, body: text }
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
 *
 * An empty frontmatter map writes no fence at all, just `body` -- this keeps
 * `serializeSkillMd(parseSkillMd(x).frontmatter, parseSkillMd(x).body) === x`
 * for a file with no frontmatter, per D5. Writing a synthetic `---\n\n---\n`
 * fence around a file that never had one would be new content, not a
 * faithful round trip.
 */
export function serializeSkillMd(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  if (Object.keys(frontmatter).length === 0) {
    return body
  }

  const yamlBlock = yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd()
  return `---\n${yamlBlock}\n---\n${body}`
}
