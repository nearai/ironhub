import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"

import {
  CAPABILITIES_STUB_SHA256,
  CAPABILITIES_STUB_SIZE_BYTES,
  LOADOUT_MEMBER_KINDS,
  MAX_METADATA_BYTES,
  MAX_TOOL_PROMPT_ARTIFACTS,
  MAX_TOOL_SCHEMA_ARTIFACTS,
  MAX_WASM_BYTES,
  capabilitiesStubBytes,
  isExtensionAssetPath,
  loadoutArtifactDigest,
  skillArtifactDigest,
  skillEntryArtifactDigest,
  soulArtifactDigest,
  toolArtifactDigest,
  toolEntryArtifactDigest,
} from "./ironclaw-contract.ts"

// Distinguishable, trivially reproducible stand-ins for real digests: the
// point of the vectors below is the *layout* of the material, so a reader
// checking them against the Rust can see at a glance which field moved.
const WASM = "1".repeat(64)
const CAPABILITIES = "2".repeat(64)
const MANIFEST = "3".repeat(64)
const SCHEMA_INPUT = "4".repeat(64)
const SCHEMA_OUTPUT = "5".repeat(64)
const PROMPT = "6".repeat(64)

const SCHEMAS = {
  // Deliberately out of sorted order in the literal: the digest must not
  // depend on insertion order, only on sorted-path order.
  "schemas/test-tool/raw_output.v1.json": SCHEMA_OUTPUT,
  "schemas/test-tool/invoke.input.v1.json": SCHEMA_INPUT,
}
const PROMPTS = { "prompts/test-tool/invoke.md": PROMPT }

// --- Known vectors ----------------------------------------------------------
//
// These three constants were computed outside this codebase, by assembling
// the material byte-for-byte from `tool_artifact_digest`'s Rust source and
// hashing it independently. They are the regression anchor for the formula:
// a refactor that still "looks right" but reorders a field, drops a NUL, or
// sorts by the wrong key changes one of them.

const FULL_ENTRY_DIGEST =
  "sha256:3e9fcb6f5ca06615589bee4e3fdb7582f3abce863f4d2c8f66191c6a6f4e943a"
const MINIMAL_ENTRY_DIGEST =
  "sha256:61e108a00b47bd92635ead38de301dc93d012fb5dcd854d9e8a9c61942bd9ee9"
const SKILL_DIGEST =
  "sha256:3138bb9bc78df27c473ecfd1410f7bd45ebac1f59cf3ff9cfe4db77aab7aedd3"

test("toolArtifactDigest matches the known vector for a fully populated entry", () => {
  assert.equal(
    toolArtifactDigest({
      wasmSha256: WASM,
      capabilitiesSha256: CAPABILITIES,
      manifestSha256: MANIFEST,
      schemas: SCHEMAS,
      prompts: PROMPTS,
    }),
    FULL_ENTRY_DIGEST
  )
})

test("toolArtifactDigest matches the known vector for an entry with no manifest and no assets", () => {
  assert.equal(
    toolArtifactDigest({ wasmSha256: WASM, capabilitiesSha256: CAPABILITIES }),
    MINIMAL_ENTRY_DIGEST
  )
})

test("toolArtifactDigest builds exactly the material tool_artifact_digest builds", () => {
  // The vectors above prove the result; this proves *why*, by rebuilding the
  // material here in the shape the Rust writes it and hashing it separately.
  // A future reader comparing this file to `catalog.rs` can diff line for
  // line instead of trusting a hex string.
  const material =
    `wasm:${WASM}\0` +
    `capabilities:${CAPABILITIES}\0` +
    `manifest:${MANIFEST}\0` +
    `schema:schemas/test-tool/invoke.input.v1.json\0${SCHEMA_INPUT}\0` +
    `schema:schemas/test-tool/raw_output.v1.json\0${SCHEMA_OUTPUT}\0` +
    `prompt:prompts/test-tool/invoke.md\0${PROMPT}\0`

  assert.equal(material.length, 542)
  assert.equal(
    `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`,
    FULL_ENTRY_DIGEST
  )
})

test("toolArtifactDigest omits the manifest segment when there is no manifest artifact", () => {
  const withManifest = toolArtifactDigest({
    wasmSha256: WASM,
    capabilitiesSha256: CAPABILITIES,
    manifestSha256: MANIFEST,
  })
  const withoutManifest = toolArtifactDigest({
    wasmSha256: WASM,
    capabilitiesSha256: CAPABILITIES,
    manifestSha256: null,
  })

  assert.notEqual(withManifest, withoutManifest)
  assert.equal(withoutManifest, MINIMAL_ENTRY_DIGEST)
})

test("toolArtifactDigest is stable across key insertion order but changes with asset content", () => {
  const reordered = toolArtifactDigest({
    wasmSha256: WASM,
    capabilitiesSha256: CAPABILITIES,
    manifestSha256: MANIFEST,
    schemas: {
      "schemas/test-tool/invoke.input.v1.json": SCHEMA_INPUT,
      "schemas/test-tool/raw_output.v1.json": SCHEMA_OUTPUT,
    },
    prompts: PROMPTS,
  })
  assert.equal(reordered, FULL_ENTRY_DIGEST)

  const oneSchemaChanged = toolArtifactDigest({
    wasmSha256: WASM,
    capabilitiesSha256: CAPABILITIES,
    manifestSha256: MANIFEST,
    schemas: { ...SCHEMAS, "schemas/test-tool/invoke.input.v1.json": "7".repeat(64) },
    prompts: PROMPTS,
  })
  assert.notEqual(oneSchemaChanged, FULL_ENTRY_DIGEST)
})

test("toolArtifactDigest separates the schema and prompt namespaces", () => {
  // The same path under the two kinds must not collide -- the `schema:` and
  // `prompt:` field labels are what keeps them apart, and dropping either
  // label would still produce a plausible-looking digest.
  const asSchema = toolArtifactDigest({
    wasmSha256: WASM,
    capabilitiesSha256: CAPABILITIES,
    schemas: { "assets/thing.json": SCHEMA_INPUT },
  })
  const asPrompt = toolArtifactDigest({
    wasmSha256: WASM,
    capabilitiesSha256: CAPABILITIES,
    prompts: { "assets/thing.json": SCHEMA_INPUT },
  })
  assert.notEqual(asSchema, asPrompt)
})

test("skillArtifactDigest still matches the agent's no-bundled-files formula", () => {
  // C14 regression guard. The hub's original `artifactDigest([sha])` produced
  // `sha256:` + SHA-256 of the *SHA string*, which coincidentally already
  // matched `skill_artifact_digest`. This change replaces the tool formula
  // and must leave that coincidence intact.
  assert.equal(skillArtifactDigest(WASM), SKILL_DIGEST)
  assert.equal(
    skillArtifactDigest(WASM),
    `sha256:${createHash("sha256").update(WASM, "utf8").digest("hex")}`
  )
})

test("skillEntryArtifactDigest takes the no-files branch for an entry with no files", () => {
  const entry = { skill_md: { sha256: WASM } }

  assert.equal(skillEntryArtifactDigest(entry), skillArtifactDigest(WASM))
  assert.equal(skillEntryArtifactDigest({ ...entry, files: [] }), SKILL_DIGEST)
})

test("skillEntryArtifactDigest matches the agent's bundled-files formula", () => {
  // `skill_artifact_digest` in `ironclaw:.../ironhub/catalog.rs:249-259`. The
  // framing is not an extension of the no-files case: with files the skill
  // document itself becomes a labelled, NUL-terminated field.
  const entry = {
    skill_md: { sha256: WASM },
    files: [
      // Out of sorted order on purpose -- the agent sorts by path before
      // hashing, so insertion order must not reach the digest.
      { path: "reference/b.md", sha256: SCHEMA_OUTPUT },
      { path: "reference/a.md", sha256: SCHEMA_INPUT },
    ],
  }

  const expected = `sha256:${createHash("sha256")
    .update(
      `skill_md:${WASM}\0file:reference/a.md\0${SCHEMA_INPUT}\0file:reference/b.md\0${SCHEMA_OUTPUT}\0`,
      "utf8"
    )
    .digest("hex")}`

  assert.equal(skillEntryArtifactDigest(entry), expected)
  // A published skill with files must NOT digest as if it had none -- that is
  // the mismatch that made every official skill carrying `files[]`
  // uninstallable.
  assert.notEqual(skillEntryArtifactDigest(entry), skillArtifactDigest(WASM))
})

test("changing one bundled skill file changes the digest", () => {
  const withFile = (sha256) => ({
    skill_md: { sha256: WASM },
    files: [{ path: "reference/a.md", sha256 }],
  })

  assert.notEqual(
    skillEntryArtifactDigest(withFile(SCHEMA_INPUT)),
    skillEntryArtifactDigest(withFile(SCHEMA_OUTPUT))
  )
})

test("the capabilities stub's declared size and digest describe its actual bytes", () => {
  const bytes = capabilitiesStubBytes()
  assert.equal(bytes.length, CAPABILITIES_STUB_SIZE_BYTES)
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    CAPABILITIES_STUB_SHA256
  )
  assert.deepEqual(Array.from(bytes), [0x7b, 0x7d]) // "{}"
})

test("capabilitiesStubBytes hands out a fresh buffer each call", () => {
  const first = capabilitiesStubBytes()
  first[0] = 0
  assert.equal(capabilitiesStubBytes()[0], 0x7b)
})

test("isExtensionAssetPath accepts real asset paths and rejects unpublishable ones", () => {
  assert.equal(isExtensionAssetPath("schemas/firecrawl/invoke.input.v1.json"), true)
  assert.equal(isExtensionAssetPath("prompts/firecrawl/scrape.md"), true)
  assert.equal(isExtensionAssetPath("a-b_c.1/d"), true)

  assert.equal(isExtensionAssetPath(""), false)
  assert.equal(isExtensionAssetPath("/schemas/input.json"), false)
  assert.equal(isExtensionAssetPath("../secret.json"), false)
  assert.equal(isExtensionAssetPath("schemas/../../etc/passwd"), false)
  assert.equal(isExtensionAssetPath("schemas/./input.json"), false)
  assert.equal(isExtensionAssetPath("schemas//input.json"), false)
  assert.equal(isExtensionAssetPath("schemas/input file.json"), false)
  assert.equal(isExtensionAssetPath("schemas\\input.json"), false)
  assert.equal(isExtensionAssetPath("https://example.com/input.json"), false)
  // A host-synthesized `standard:` schema ref is not a publishable asset
  // path -- see the note in bundle.ts on standard_op tools.
  assert.equal(isExtensionAssetPath("standard:messaging/send.input.v1"), false)
})

test("the pinned agent limits are the values read from the agent source", () => {
  assert.equal(MAX_TOOL_SCHEMA_ARTIFACTS, 32)
  assert.equal(MAX_TOOL_PROMPT_ARTIFACTS, 64)
  assert.equal(MAX_METADATA_BYTES, 1048576)
  assert.equal(MAX_WASM_BYTES, 16777216)
})

// --- toolEntryArtifactDigest ------------------------------------------------

const artifact = (sha256) => ({ url: "https://hub.example/a", size_bytes: 1, sha256 })

test("toolEntryArtifactDigest digests exactly the artifacts the entry publishes", () => {
  const entry = {
    name: "test-tool",
    crate_name: "test-tool",
    version: "0.1.0",
    description: "",
    provenance: "private",
    wasm: artifact(WASM),
    capabilities: artifact(CAPABILITIES),
    manifest: artifact(MANIFEST),
    schemas: Object.fromEntries(
      Object.entries(SCHEMAS).map(([path, sha]) => [path, artifact(sha)])
    ),
    prompts: Object.fromEntries(
      Object.entries(PROMPTS).map(([path, sha]) => [path, artifact(sha)])
    ),
  }

  assert.equal(toolEntryArtifactDigest(entry), FULL_ENTRY_DIGEST)
})

test("toolEntryArtifactDigest ignores everything about an entry except its digests", () => {
  // URLs and sizes carry a token and a byte count that vary per install; the
  // agent recomputes from the SHA fields alone, so neither may leak into the
  // material.
  const base = {
    name: "test-tool",
    crate_name: "test-tool",
    version: "0.1.0",
    description: "",
    provenance: "private",
    wasm: artifact(WASM),
    capabilities: artifact(CAPABILITIES),
  }
  assert.equal(
    toolEntryArtifactDigest(base),
    toolEntryArtifactDigest({
      ...base,
      name: "renamed",
      version: "9.9.9",
      wasm: { url: "https://elsewhere/x?tok=2", size_bytes: 999, sha256: WASM },
    })
  )
  assert.equal(toolEntryArtifactDigest(base), MINIMAL_ENTRY_DIGEST)
})

test("toolEntryArtifactDigest refuses an entry with no capabilities artifact", () => {
  // C7: such an entry fails the agent's parse of the whole manifest, so there
  // is no digest that would make it installable -- producing one would only
  // move the failure somewhere less legible.
  assert.throws(
    () =>
      toolEntryArtifactDigest({
        name: "test-tool",
        crate_name: "test-tool",
        version: "0.1.0",
        description: "",
        provenance: "private",
        wasm: artifact(WASM),
      }),
    /capabilities/
  )
})

// --- Souls ------------------------------------------------------------------

test("soulArtifactDigest matches the skill no-bundled-files vector", () => {
  // A soul publishes as a skill entry with no `files[]`, so the value the
  // agent recomputes is `skill_artifact_digest`'s no-files branch. Pinned
  // against the same known vector the skill branch uses: if these two ever
  // stop being equal without the agent having grown a soul formula, one of
  // them is wrong.
  assert.equal(soulArtifactDigest(WASM), SKILL_DIGEST)
  assert.equal(soulArtifactDigest(WASM), skillArtifactDigest(WASM))
  assert.equal(
    soulArtifactDigest(WASM),
    `sha256:${createHash("sha256").update(WASM, "utf8").digest("hex")}`
  )
})

test("a soul's digest changes when its document changes", () => {
  assert.notEqual(soulArtifactDigest(WASM), soulArtifactDigest(CAPABILITIES))
})

// --- Loadouts ---------------------------------------------------------------
//
// UNCONFIRMED formula: these vectors pin what IronHub proposed in ask 4 and
// implemented against, not something read out of the agent. When ask 4 comes
// back (task 9.1), this block is what says whether the answer agrees with what
// the hub has been computing.

const MEMBER_NEAR_RPC = `sha256:${"a".repeat(64)}`
const MEMBER_RISK_TOOL = `sha256:${"b".repeat(64)}`
const MEMBER_CHART_SKILL = `sha256:${"c".repeat(64)}`
const MEMBER_TRADER_SOUL = `sha256:${"d".repeat(64)}`

// Computed outside this codebase, by assembling the material byte-for-byte
// from ask 4's formula block and hashing it independently -- the regression
// anchor for the kind order, the NUL layout, and the `sha256:` prefix being
// part of the member digest rather than stripped from it.
const LOADOUT_DIGEST =
  "sha256:de6a4410db611b7e61b086715398fd0830f9076c9aa681fa8e52733a1bcf31cd"

/** Deliberately in no useful order: sorting is the function's job. */
function traderLoadout() {
  return [
    { kind: "soul", name: "trader", digest: MEMBER_TRADER_SOUL },
    { kind: "tool", name: "risk-tool", digest: MEMBER_RISK_TOOL },
    { kind: "skill", name: "chart", digest: MEMBER_CHART_SKILL },
    { kind: "tool", name: "near-rpc", digest: MEMBER_NEAR_RPC },
  ]
}

test("loadoutArtifactDigest matches the known vector for a mixed loadout", () => {
  assert.equal(loadoutArtifactDigest(traderLoadout()), LOADOUT_DIGEST)
})

test("task 4.3: member insertion order does not affect the digest", () => {
  // Members arrive from a query with its own idea of order, and re-adding one
  // member rewrites that order without changing what the loadout holds. The
  // agent recomputes from the manifest arrays and compares for equality, so an
  // order-sensitive digest would refuse an install for a reordering nobody
  // made.
  const members = traderLoadout()
  const reversed = [...members].reverse()
  const rotated = [...members.slice(2), ...members.slice(0, 2)]

  assert.equal(loadoutArtifactDigest(reversed), LOADOUT_DIGEST)
  assert.equal(loadoutArtifactDigest(rotated), LOADOUT_DIGEST)
  // Every permutation, not three hand-picked ones: with four members that is
  // 24 orderings and costs nothing.
  for (const permutation of permutations(members)) {
    assert.equal(loadoutArtifactDigest(permutation), LOADOUT_DIGEST)
  }
  // The input is not sorted in place: a caller's array is its own.
  assert.equal(members[0].name, "trader")
})

function permutations(items) {
  if (items.length <= 1) {
    return [items]
  }
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest]
    )
  )
}

test("kinds are concatenated in the declared order, not bytewise", () => {
  // Ask 4's two ordering clauses disagree, and this is the one we implement:
  // tool, skill, soul -- the order its formula block lists and the order the
  // manifest arrays are in. Bytewise on the kind label would give skill, soul,
  // tool and a different digest, so the choice is pinned rather than implied.
  const bytewiseByKind = [
    { kind: "skill", name: "chart", digest: MEMBER_CHART_SKILL },
    { kind: "soul", name: "trader", digest: MEMBER_TRADER_SOUL },
    { kind: "tool", name: "near-rpc", digest: MEMBER_NEAR_RPC },
    { kind: "tool", name: "risk-tool", digest: MEMBER_RISK_TOOL },
  ]
  const material =
    `tool:near-rpc\0${MEMBER_NEAR_RPC}\0` +
    `tool:risk-tool\0${MEMBER_RISK_TOOL}\0` +
    `skill:chart\0${MEMBER_CHART_SKILL}\0` +
    `soul:trader\0${MEMBER_TRADER_SOUL}\0`

  assert.equal(
    loadoutArtifactDigest(bytewiseByKind),
    `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`
  )
  assert.deepEqual(LOADOUT_MEMBER_KINDS, ["tool", "skill", "soul"])
})

test("names sort bytewise within a kind, not by UTF-16 code unit", () => {
  // Same divergence `compareAssetPaths` documents: above the BMP the two
  // orderings disagree, and the agent's is the bytewise one.
  const astral = { kind: "tool", name: "\u{1f600}", digest: MEMBER_NEAR_RPC }
  const bmp = { kind: "tool", name: "ﬀ", digest: MEMBER_RISK_TOOL }
  const material =
    `tool:ﬀ\0${MEMBER_RISK_TOOL}\0` + `tool:\u{1f600}\0${MEMBER_NEAR_RPC}\0`

  assert.equal(
    loadoutArtifactDigest([astral, bmp]),
    `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`
  )
})

test("changing any one member changes the loadout digest", () => {
  // The property the whole formula exists for: a member that moved must be
  // visible in the loadout's digest, whichever member it was.
  const seen = new Set([LOADOUT_DIGEST])
  for (let index = 0; index < traderLoadout().length; index += 1) {
    const changed = traderLoadout()
    changed[index] = { ...changed[index], digest: `sha256:${"e".repeat(64)}` }
    const digest = loadoutArtifactDigest(changed)
    assert.equal(seen.has(digest), false, `member ${index} did not move the digest`)
    seen.add(digest)
  }

  // A renamed member too: the name is in the material, so renaming is a change
  // even when every byte the member publishes is identical.
  const renamed = traderLoadout()
  renamed[1] = { ...renamed[1], name: "risk-tool-2" }
  assert.equal(seen.has(loadoutArtifactDigest(renamed)), false)
})

test("removing a member changes the digest rather than truncating it", () => {
  const withoutSoul = traderLoadout().filter((member) => member.kind !== "soul")

  assert.notEqual(loadoutArtifactDigest(withoutSoul), LOADOUT_DIGEST)
})

test("a one-member loadout digests differently from its member", () => {
  // The framing is not an extension of the member's own digest -- the same
  // trap `skillEntryArtifactDigest`'s two branches document. A loadout holding
  // one tool is not that tool.
  assert.notEqual(
    loadoutArtifactDigest([
      { kind: "tool", name: "near-rpc", digest: MEMBER_NEAR_RPC },
    ]),
    MEMBER_NEAR_RPC
  )
})

test("a private and a public member sharing a name still digest deterministically", () => {
  // Member identity is unique per (source, kind, name), so this pair is
  // representable and the material has no source field to separate it with.
  // The value is still order-independent, which is all this function can
  // promise; refusing the collision is composition's job.
  const collision = [
    { kind: "tool", name: "near-rpc", digest: MEMBER_NEAR_RPC },
    { kind: "tool", name: "near-rpc", digest: MEMBER_RISK_TOOL },
  ]

  assert.equal(
    loadoutArtifactDigest(collision),
    loadoutArtifactDigest([...collision].reverse())
  )
})

test("loadoutArtifactDigest refuses an empty member list", () => {
  // An empty loadout cannot be published, so no install payload is ever minted
  // for one. Digesting an empty material would hand every empty loadout the
  // same value and make that reachable state look installable.
  assert.throws(() => loadoutArtifactDigest([]), /at least one member/)
})
