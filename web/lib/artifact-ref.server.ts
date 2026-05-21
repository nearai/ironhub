export type IliadArtifactRef = ["i", string, string, string, "w" | "c" | "s"]
export type GithubArtifactRef = ["g", string]
export type ArtifactRef = IliadArtifactRef | GithubArtifactRef

export function hubBaseUrl(): string {
  return process.env.HUB_PUBLIC_BASE_URL ?? "https://hub.ironclaw.com"
}

export function encodeArtifactRef(ref: ArtifactRef): string {
  return Buffer.from(JSON.stringify(ref), "utf8").toString("base64url")
}

export function hubArtifactUrl(ref: ArtifactRef): string {
  return `${hubBaseUrl()}/api/catalog/artifact/${encodeArtifactRef(ref)}`
}
