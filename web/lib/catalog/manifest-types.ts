export type Provenance = "official" | "trusted" | "verified" | "private" | "new"

export type HubArtifact = {
  url: string
  size_bytes: number
  sha256: string
}

export type HubToolEntry = {
  name: string
  crate_name: string
  version: string
  description: string
  provenance: Provenance
  wasm: HubArtifact
  capabilities?: HubArtifact
  manifest?: HubArtifact
  schemas?: Record<string, HubArtifact>
  prompts?: Record<string, HubArtifact>
}

export type HubSkillFile = HubArtifact & {
  path: string
}

export type HubSkillEntry = {
  name: string
  trunk: string
  version: string
  description: string
  provenance: Provenance
  skill_md: HubArtifact
  files?: HubSkillFile[]
}

export type HubManifest = {
  version: string
  generated_at: string
  release_tag: string
  repo: string
  tools: HubToolEntry[]
  skills: HubSkillEntry[]
}

export type VersionEntry = {
  kind: "tool" | "skill"
  name: string
  version: string
  digest: string
}

type VersionDocumentHeader = {
  version: "1"
  generated_at: string
  release_tag: string
  repo: string
}

export type VersionIndex = VersionDocumentHeader & {
  entries: VersionEntry[]
}

export type VersionIndexUnchanged = VersionDocumentHeader & {
  unchanged: true
}

export type SignableDocument =
  | HubManifest
  | VersionIndex
  | VersionIndexUnchanged
