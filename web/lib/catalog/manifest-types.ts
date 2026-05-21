export type Provenance = "official" | "trusted" | "verified" | "new"

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
  capabilities: HubArtifact
}

export type HubSkillEntry = {
  name: string
  trunk: string
  version: string
  description: string
  provenance: Provenance
  skill_md: HubArtifact
}

export type HubManifest = {
  version: string
  generated_at: string
  release_tag: string
  repo: string
  tools: HubToolEntry[]
  skills: HubSkillEntry[]
}
