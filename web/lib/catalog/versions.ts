import { createHash } from "node:crypto"

import type {
  HubArtifact,
  HubManifest,
  VersionEntry,
  VersionIndex,
  VersionIndexUnchanged,
} from "@/lib/catalog/manifest-types"

type DigestArtifact = HubArtifact & { path?: string }

export function entryDigest(artifacts: (DigestArtifact | undefined)[]) {
  const hash = createHash("sha256")
  for (const artifact of artifacts) {
    for (const value of [artifact?.path ?? "", artifact?.sha256 ?? ""]) {
      hash.update(String(Buffer.byteLength(value, "utf8")))
      hash.update(":")
      hash.update(value)
      hash.update(":")
    }
  }
  return `sha256:${hash.digest("hex")}`
}

function comparePath(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function byPath(left: { path: string }, right: { path: string }) {
  return comparePath(left.path, right.path)
}

function toolPathArtifacts(artifacts: Record<string, HubArtifact> | undefined) {
  return Object.entries(artifacts ?? {})
    .sort(([left], [right]) => comparePath(left, right))
    .map(([path, artifact]) => ({ ...artifact, path }))
}

export function toVersionEntries(manifest: HubManifest): VersionEntry[] {
  const entries: VersionEntry[] = [
    ...manifest.tools.map((tool) => ({
      kind: "tool" as const,
      name: tool.name,
      version: tool.version,
      digest: entryDigest([
        tool.wasm,
        tool.capabilities,
        tool.manifest,
        ...toolPathArtifacts(tool.schemas),
        ...toolPathArtifacts(tool.prompts),
      ]),
    })),
    ...manifest.skills.map((skill) => ({
      kind: "skill" as const,
      name: skill.name,
      version: skill.version,
      digest: entryDigest([
        skill.skill_md,
        ...[...(skill.files ?? [])].sort(byPath),
      ]),
    })),
  ]

  return entries.sort((left, right) =>
    left.kind === right.kind
      ? left.name.localeCompare(right.name)
      : left.kind.localeCompare(right.kind)
  )
}

export function toVersionIndex(manifest: HubManifest): VersionIndex {
  return {
    version: "1",
    generated_at: manifest.generated_at,
    release_tag: manifest.release_tag,
    repo: manifest.repo,
    entries: toVersionEntries(manifest),
  }
}

export function toUnchanged(index: VersionIndex): VersionIndexUnchanged {
  return {
    version: index.version,
    generated_at: index.generated_at,
    release_tag: index.release_tag,
    repo: index.repo,
    unchanged: true,
  }
}

export type VersionResolverOptions = {
  load: () => Promise<VersionIndex>
  ttlMs: number
  staleMs: number
  now?: () => number
  onStale?: (error: unknown, ageMs: number) => void
}

export function createVersionResolver({
  load,
  ttlMs,
  staleMs,
  now = Date.now,
  onStale,
}: VersionResolverOptions) {
  let cached: { builtAtMs: number; index: VersionIndex } | null = null
  let inFlight: Promise<VersionIndex> | null = null

  async function currentIndex(): Promise<VersionIndex> {
    if (cached && now() - cached.builtAtMs < ttlMs) {
      return cached.index
    }
    if (!inFlight) {
      inFlight = load()
        .then((index) => {
          cached = { builtAtMs: now(), index }
          return index
        })
        .finally(() => {
          inFlight = null
        })
    }

    try {
      return await inFlight
    } catch (error) {
      if (!cached) {
        throw error
      }
      const ageMs = now() - cached.builtAtMs
      if (ageMs > staleMs) {
        throw error
      }
      onStale?.(error, ageMs)
      return cached.index
    }
  }

  return async function resolve(
    since?: string | null
  ): Promise<VersionIndex | VersionIndexUnchanged> {
    const index = await currentIndex()
    return since && since === index.release_tag ? toUnchanged(index) : index
  }
}
