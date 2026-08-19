// The IronClaw agent-side contract, pinned in one place.
//
// Nothing here is a hub policy choice. Every value is a constant compiled
// into the agent, so changing one changes what the agent *accepts*, not what
// we choose to publish -- and a value that drifts out of step with the agent
// produces an artifact that uploads cleanly, signs cleanly, and fails at
// install with an error naming the agent's own limits. Each value therefore
// carries the source it was read from, so an agent version bump can be
// re-verified by re-reading those lines rather than re-derived from failures.
//
// Paths prefixed `ironclaw:` are relative to the IronClaw checkout that sits
// beside this repo.

import { createHash } from "node:crypto"

import type { HubSkillEntry, HubToolEntry } from "@/lib/catalog/manifest-types"

// --- Per-tool asset counts -------------------------------------------------

/**
 * Maximum schema artifacts one tool entry may publish.
 * `ironclaw:crates/extensions/ironclaw_extension_manager/src/ironhub/model.rs:21`,
 * enforced in `catalog.rs` `validate_manifest_artifacts`.
 */
export const MAX_TOOL_SCHEMA_ARTIFACTS = 32

/**
 * Maximum prompt artifacts one tool entry may publish.
 * `ironclaw:.../ironhub/model.rs:22`, same enforcement point.
 */
export const MAX_TOOL_PROMPT_ARTIFACTS = 64

// --- Per-artifact byte ceilings --------------------------------------------

/**
 * The ceiling the agent applies to every *metadata* artifact it downloads:
 * `manifest.toml`, the capabilities document, a skill document, and each
 * individual schema and prompt asset. `ironclaw:.../ironhub/model.rs:16`
 * (`MAX_METADATA_BYTES`), applied per artifact in `validate_manifest_artifacts`.
 */
export const MAX_METADATA_BYTES = 1024 * 1024

/**
 * The ceiling the agent applies to a wasm module.
 * `ironclaw:.../ironhub/model.rs:17` (`MAX_WASM_BYTES`).
 */
export const MAX_WASM_BYTES = 16 * 1024 * 1024

/**
 * The ceiling on the *decoded* catalog manifest document itself, and on the
 * signed envelope carrying it. `ironclaw:.../ironhub/model.rs:14-15`. These
 * scale with published asset count -- roughly 150 bytes of JSON per asset --
 * so they are a real bound once schemas and prompts are published, not a
 * theoretical one.
 */
export const MAX_MANIFEST_BYTES = 1024 * 1024
export const MAX_SIGNED_MANIFEST_BYTES = MAX_MANIFEST_BYTES * 2

// --- Asset path grammar ----------------------------------------------------

/**
 * The agent validates every published asset path with
 * `ExtensionAssetPath::new`
 * (`ironclaw:crates/contracts/ironclaw_extension_contracts/src/runtime.rs`),
 * which rejects: empty paths, NUL and control characters, anything containing
 * `://`, leading `/`, backslashes and Windows drive prefixes, and empty / `.`
 * / `..` segments. It otherwise permits any character, including spaces and
 * non-ASCII.
 *
 * We publish under a deliberately narrower rule -- the ASCII set below -- for
 * two reasons. It is a strict subset of what the agent accepts, so a path we
 * accept always installs; and it keeps a path safe to use verbatim as an
 * object-storage key and inside a URL path segment without an encoding step
 * that could make the published path and the manifest-declared path differ.
 *
 * Both catalog paths call this one predicate: `official-tools.ts` for the
 * public path and `private-artifacts/assets.ts` (via bundle ingest) for the
 * private one. It used to be written out twice, which is how the two paths
 * came to disagree about what to do with a path they both rejected.
 */
const EXTENSION_ASSET_PATH_CHARACTERS = /^[A-Za-z0-9._/-]+$/

export function isExtensionAssetPath(path: string): boolean {
  if (
    !path ||
    path.startsWith("/") ||
    !EXTENSION_ASSET_PATH_CHARACTERS.test(path)
  ) {
    return false
  }
  return path
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..")
}

// --- Capabilities stub (upstream workaround) -------------------------------

/**
 * UPSTREAM WORKAROUND -- remove when the filed IronClaw issue "capabilities.json
 * required for nothing" lands. UPSTREAM-IRONCLAW.md, beside this file, lists
 * every symbol to delete when it does.
 *
 * `IronHubToolEntry.capabilities` has no serde default
 * (`ironclaw:.../ironhub/model.rs:100`), so an entry without it fails the parse
 * of the *entire* manifest, not just that entry. The bytes are then written to
 * `legacy/capabilities.json` (`ironclaw:.../ironhub/package.rs:52`) and never
 * read again -- a repo-wide search finds no parse, no validation, no consumer.
 *
 * A manifest v3 tool carries its metadata in `manifest.toml` and legitimately
 * ships no `*.capabilities.json`, so we publish these two bytes in its place.
 * Serving it from a constant rather than a stored object keeps the digest and
 * size deterministic and costs no storage.
 *
 * The size and digest are precomputed literals so a caller can advertise them
 * in a manifest without hashing anything; `capabilitiesStubBytes()` returns the
 * exact bytes those two describe.
 */
export const CAPABILITIES_STUB_TEXT = "{}"
export const CAPABILITIES_STUB_SIZE_BYTES = 2
export const CAPABILITIES_STUB_SHA256 =
  "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"

/** A fresh copy each call -- callers may hand the buffer to a response stream. */
export function capabilitiesStubBytes(): Uint8Array {
  return new TextEncoder().encode(CAPABILITIES_STUB_TEXT)
}

// --- Artifact digests ------------------------------------------------------

/**
 * `sha256:<lower-hex>` over UTF-8 bytes, matching
 * `ironclaw:crates/contracts/ironclaw_host_api/src/approval.rs:106`
 * (`sha256_digest_token`), which every artifact digest below is wrapped in.
 */
function sha256DigestToken(material: string): string {
  return `sha256:${createHash("sha256").update(material, "utf8").digest("hex")}`
}

/**
 * Rust's `BTreeMap<String, _>` iterates in `Ord for String` order, which is
 * bytewise over UTF-8. JavaScript's default sort compares UTF-16 code units,
 * which agrees for the ASCII paths our grammar permits and disagrees above the
 * BMP. Comparing the encoded bytes directly removes the "agrees for the inputs
 * we happen to allow" caveat from a value the agent will re-derive and compare
 * for equality.
 */
export function compareAssetPaths(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"))
}

function sortedByPath<T>(
  assets: Readonly<Record<string, T>> | undefined
): Array<[string, T]> {
  return Object.entries(assets ?? {}).sort(([left], [right]) =>
    compareAssetPaths(left, right)
  )
}

/** Path -> lower-hex SHA-256, exactly as advertised in the manifest entry. */
export type ToolArtifactDigestInput = {
  wasmSha256: string
  capabilitiesSha256: string
  /** Omitted only for an entry that publishes no `manifest.toml`. */
  manifestSha256?: string | null
  schemas?: Readonly<Record<string, string>>
  prompts?: Readonly<Record<string, string>>
}

/**
 * The digest the agent recomputes from a catalog entry and compares against
 * the one signed into the install delivery -- `tool_artifact_digest` in
 * `ironclaw:.../ironhub/catalog.rs:210-235`.
 *
 * The material is a single string of `\0`-separated fields, where `\0` is a
 * literal NUL byte, not the two characters `\` and `0`:
 *
 *   wasm:{sha}\0
 *   capabilities:{sha}\0
 *   manifest:{sha}\0                 (only when a manifest artifact is present)
 *   schema:{path}\0{sha}\0           (per schema, in sorted-path order)
 *   prompt:{path}\0{sha}\0           (per prompt, in sorted-path order)
 *
 * Note the asymmetry, which is easy to get wrong: the three fixed fields put
 * one NUL *after* the value, while an asset entry puts one after the path and
 * another after its digest. Schemas always precede prompts. Everything after
 * `capabilities` is optional, so a tool with no manifest and no assets digests
 * over just the first two fields.
 */
export function toolArtifactDigest(entry: ToolArtifactDigestInput): string {
  let material = `wasm:${entry.wasmSha256}\0capabilities:${entry.capabilitiesSha256}\0`
  if (entry.manifestSha256) {
    material += `manifest:${entry.manifestSha256}\0`
  }
  for (const [path, sha256] of sortedByPath(entry.schemas)) {
    material += `schema:${path}\0${sha256}\0`
  }
  for (const [path, sha256] of sortedByPath(entry.prompts)) {
    material += `prompt:${path}\0${sha256}\0`
  }
  return sha256DigestToken(material)
}

/**
 * The digest of a catalog entry *as published*, rather than of an asset set
 * assembled a second time beside it.
 *
 * This exists to make one class of bug unrepresentable. The agent recomputes
 * `tool_artifact_digest` from the entry it parsed out of the manifest and
 * compares it against the digest signed into the install delivery, so the two
 * must be taken over the same assets. Whenever a caller builds the entry from
 * one query and the digest from another -- which is exactly what produced D4
 * -- the two agree only for as long as nobody edits one of them. Passing the
 * finished `HubToolEntry` in makes the published set the *only* set there is:
 * an asset that is not in the entry cannot reach the digest, and one that is
 * cannot be left out of it.
 *
 * Both install paths route through here: the public catalog entry from
 * `officialToolEntry`, and the private entry from
 * `buildPrivateArtifactEntry`.
 *
 * Throws on an entry with no `capabilities`. `HubToolEntry` types the field
 * optional, but per C7 the agent's parser has no serde default for it, so
 * such an entry does not merely digest differently -- it fails the parse of
 * the entire manifest it appears in. There is no digest that would make it
 * installable, so producing one would only move the failure somewhere less
 * legible. The private builder's stub fallback exists precisely so this is
 * unreachable there.
 */
export function toolEntryArtifactDigest(entry: HubToolEntry): string {
  if (!entry.capabilities) {
    throw new Error(
      `Tool entry ${entry.name} has no capabilities artifact; the agent cannot parse a manifest containing it (C7)`
    )
  }
  return toolArtifactDigest({
    wasmSha256: entry.wasm.sha256,
    capabilitiesSha256: entry.capabilities.sha256,
    manifestSha256: entry.manifest?.sha256 ?? null,
    schemas: assetShaByPath(entry.schemas),
    prompts: assetShaByPath(entry.prompts),
  })
}

function assetShaByPath(
  assets: Readonly<Record<string, { sha256: string }>> | undefined
): Record<string, string> {
  return Object.fromEntries(
    sortedByPath(assets).map(([path, artifact]) => [path, artifact.sha256])
  )
}

/**
 * `skill_artifact_digest` in `ironclaw:.../ironhub/catalog.rs:245-260`, for the
 * no-bundled-files case: the digest is taken over the skill document's SHA-256
 * *string*, not over its bytes and not over any framing.
 *
 * Correct only for an entry that publishes no `files[]`. Prefer
 * `skillEntryArtifactDigest`, which decides which branch applies from the
 * entry itself; this one is exported for the caller that has a digest and no
 * entry, and for the test that pins the no-files vector.
 */
export function skillArtifactDigest(skillMdSha256: string): string {
  return sha256DigestToken(skillMdSha256)
}

/**
 * The skill counterpart of `toolEntryArtifactDigest`, and for the same reason:
 * the digest is taken over the entry as published, so the branch cannot be
 * chosen from one place and the assets from another.
 *
 * The agent switches formula on whether `files` is empty
 * (`ironclaw:.../ironhub/catalog.rs:246`). With files it is
 *
 *   skill_md:{sha}\0
 *   file:{path}\0{sha}\0      (per file, in sorted-path order)
 *
 * -- note that the framing differs from the no-files case entirely, rather
 * than extending it: an empty `files` list is not the same as the first field
 * of the second formula. Choosing wrong does not degrade, it produces a digest
 * the agent never reproduces, and the install is refused as changed.
 */
export function skillEntryArtifactDigest(entry: HubSkillEntry): string {
  const files = entry.files ?? []
  if (files.length === 0) {
    return skillArtifactDigest(entry.skill_md.sha256)
  }

  let material = `skill_md:${entry.skill_md.sha256}\0`
  for (const file of [...files].sort((left, right) =>
    compareAssetPaths(left.path, right.path)
  )) {
    material += `file:${file.path}\0${file.sha256}\0`
  }
  return sha256DigestToken(material)
}
