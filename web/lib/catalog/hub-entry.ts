// The shape of a published tool entry, in one place.
//
// Two builders produce a `HubToolEntry`: `official-tools.ts` rewrites one out
// of the upstream `tools.json`, and `private-artifacts/manifest.ts` assembles
// one out of stored content and assets. They differ in everything that is
// genuinely different -- provenance, where an artifact URL comes from, and
// what to do about an over-cap asset set (the public path omits the tool, the
// private path rejects the upload). They agreed on the *shape* only by having
// been written to the same wire contract twice, which is how the private path
// came to publish no schemas, no prompts, and an optional `capabilities` while
// the public path published all three.
//
// So the shape moves here and the policy stays with each caller. Three rules
// live in this function and nowhere else:
//
//   1. `capabilities` is required, not optional. `IronHubToolEntry` has no
//      serde default for it (C7), so an entry without it fails the parse of
//      the whole manifest. Typing the parameter non-optional is the point --
//      a caller with nothing to put there must resolve that (with the stub,
//      for a private tool) before it can build an entry at all.
//   2. An absent optional field is absent, never `null` and never an empty
//      object. `deny_unknown_fields` is not the issue; `Option<T>` tolerates
//      both. Emitting `"schemas": {}` is simply a claim about the asset set
//      that reads as different from making no claim, and C9 compares sets.
//   3. Asset maps are emitted in sorted-path order, matching the order the
//      digest is taken in, so a diff of two manifests is readable.
// Both callers now route through here. What they still decide for themselves
// is what an unpublishable asset set means: the public path omits the tool
// from the manifest and keeps serving, because its input is an upstream
// document fetched at request time; the private path rejects the upload,
// because its input is something an author can fix.
// Relative with an explicit extension, matching lib/storage/index.ts: the
// `test:catalog` suite runs plain `node --test` without the alias loader, so a
// runtime `@/` import here would not resolve.
import { compareAssetPaths } from "./ironclaw-contract.ts"
import type { HubArtifact, HubToolEntry, Provenance } from "./manifest-types.ts"

export type HubToolEntryInput = {
  name: string
  /** Falls back to `name`, which is what both catalogs do today. */
  crateName?: string | null
  version: string
  description?: string | null
  provenance: Provenance
  wasm: HubArtifact
  /** Required -- see rule 1 above. */
  capabilities: HubArtifact
  manifest?: HubArtifact | null
  schemas?: Record<string, HubArtifact>
  prompts?: Record<string, HubArtifact>
}

export function hubToolEntry(input: HubToolEntryInput): HubToolEntry {
  const schemas = sortedByPath(input.schemas)
  const prompts = sortedByPath(input.prompts)

  return {
    name: input.name,
    crate_name: input.crateName ?? input.name,
    version: input.version,
    description: input.description ?? "",
    provenance: input.provenance,
    wasm: input.wasm,
    capabilities: input.capabilities,
    ...(input.manifest ? { manifest: input.manifest } : {}),
    ...(schemas ? { schemas } : {}),
    ...(prompts ? { prompts } : {}),
  }
}

/** Sorted copy, or `undefined` for an empty map -- see rules 2 and 3. */
function sortedByPath(
  assets: Record<string, HubArtifact> | undefined
): Record<string, HubArtifact> | undefined {
  const entries = Object.entries(assets ?? {}).sort(([left], [right]) =>
    compareAssetPaths(left, right)
  )
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}
