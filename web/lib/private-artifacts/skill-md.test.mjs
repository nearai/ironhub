import assert from "node:assert/strict"
import { test } from "node:test"

import { parseSkillMd, serializeSkillMd } from "./skill-md.ts"

test("parses frontmatter and body from a well-formed SKILL.md", () => {
  const text = [
    "---",
    "name: my-skill",
    "version: 1.0.0",
    "description: Does things.",
    "---",
    "",
    "## Persona",
    "",
    "Act helpfully.",
  ].join("\n")

  const { frontmatter, body } = parseSkillMd(text)

  assert.equal(frontmatter.name, "my-skill")
  assert.equal(frontmatter.version, "1.0.0")
  assert.equal(frontmatter.description, "Does things.")
  assert.equal(body, "\n## Persona\n\nAct helpfully.")
})

test("returns empty frontmatter and the full text as body when there is no frontmatter fence", () => {
  const text = "Just a plain markdown body, no fence at all."

  const result = parseSkillMd(text)

  assert.deepEqual(result, { frontmatter: {}, body: text })
})

test("never throws on malformed YAML in the frontmatter fence", () => {
  const text = "---\n[unterminated: [flow\n---\n\nBody text."

  assert.doesNotThrow(() => parseSkillMd(text))
  const result = parseSkillMd(text)
  assert.deepEqual(result.frontmatter, {})
})

test("never throws on an empty string", () => {
  assert.doesNotThrow(() => parseSkillMd(""))
  assert.deepEqual(parseSkillMd(""), { frontmatter: {}, body: "" })
})

test("serializeSkillMd writes back every frontmatter key and the body", () => {
  const frontmatter = { name: "my-skill", version: "1.0.0" }
  const body = "\nHello."

  const text = serializeSkillMd(frontmatter, body)

  assert.match(text, /^---\n/)
  assert.match(text, /name: my-skill/)
  assert.match(text, /version: 1\.0\.0/)
  assert.ok(text.endsWith(body))
})

test("round trip: an unknown frontmatter key survives parse -> edit a known field -> serialize", () => {
  const original = [
    "---",
    "name: my-skill",
    "version: 1.0.0",
    "description: Old description.",
    "value_prop: Old value prop.",
    "use_cases:",
    "  - Automate onboarding",
    "value_tags:",
    "  - automation",
    "activation:",
    "  keywords:",
    "    - onboarding",
    "  tags:",
    "    - productivity",
    // A key the editor UI does not know about -- must survive untouched.
    "custom_owner_note: Do not remove this field.",
    "---",
    "",
    "## Persona",
    "",
    "Be concise.",
  ].join("\n")

  const parsed = parseSkillMd(original)
  assert.equal(parsed.frontmatter.custom_owner_note, "Do not remove this field.")

  // Simulate the editor changing only `description`, leaving every other
  // key -- including the unknown one -- as parsed.
  const edited = {
    ...parsed.frontmatter,
    description: "New description.",
  }

  const saved = serializeSkillMd(edited, parsed.body)
  const reparsed = parseSkillMd(saved)

  assert.equal(reparsed.frontmatter.description, "New description.")
  assert.equal(
    reparsed.frontmatter.custom_owner_note,
    "Do not remove this field."
  )
  assert.deepEqual(reparsed.frontmatter.use_cases, ["Automate onboarding"])
  assert.deepEqual(reparsed.frontmatter.value_tags, ["automation"])
  assert.deepEqual(reparsed.frontmatter.activation, {
    keywords: ["onboarding"],
    tags: ["productivity"],
  })
  assert.equal(reparsed.body, parsed.body)
})
