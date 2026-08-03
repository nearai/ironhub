import type { HubArtifact, HubToolEntry } from "@/lib/catalog/manifest-types"

export type GithubArtifact = {
  url: string
  size_bytes: number
  sha256: string
}

export type GithubTool = {
  name: string
  crate_name?: string | null
  version: string
  description?: string | null
  wasm: GithubArtifact
  capabilities: GithubArtifact
  manifest?: GithubArtifact | null
  schemas?: Record<string, GithubArtifact> | null
}

const PUBLISHABLE_ARTIFACT_PATH = /^[A-Za-z0-9._/-]+$/
const MAX_TOOL_SCHEMA_ARTIFACTS = 32

export function isPublishableArtifactPath(path: string) {
  if (!path || path.startsWith("/") || !PUBLISHABLE_ARTIFACT_PATH.test(path)) {
    return false
  }
  return path
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..")
}

export function officialToolEntry(
  tool: GithubTool,
  artifactUrl: (upstreamUrl: string) => string
): HubToolEntry {
  const rewriteArtifact = (artifact: GithubArtifact): HubArtifact => ({
    url: artifactUrl(artifact.url),
    size_bytes: artifact.size_bytes,
    sha256: artifact.sha256,
  })
  const publishable = Object.entries(tool.schemas ?? {})
    .filter(([path]) => {
      if (isPublishableArtifactPath(path)) {
        return true
      }
      console.error(
        `Skipping tool schema with an unpublishable path: ${tool.name}/${path}`
      )
      return false
    })
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
  if (publishable.length > MAX_TOOL_SCHEMA_ARTIFACTS) {
    console.error(
      `Dropping ${publishable.length - MAX_TOOL_SCHEMA_ARTIFACTS} schema artifact(s) past the ${MAX_TOOL_SCHEMA_ARTIFACTS} cap: ${tool.name}`
    )
  }
  const schemas = Object.fromEntries(
    publishable
      .slice(0, MAX_TOOL_SCHEMA_ARTIFACTS)
      .map(([path, artifact]) => [path, rewriteArtifact(artifact)])
  )

  return {
    name: tool.name,
    crate_name: tool.crate_name ?? tool.name,
    version: tool.version,
    description: tool.description ?? "",
    provenance: "official",
    wasm: rewriteArtifact(tool.wasm),
    capabilities: rewriteArtifact(tool.capabilities),
    ...(tool.manifest ? { manifest: rewriteArtifact(tool.manifest) } : {}),
    ...(Object.keys(schemas).length > 0 ? { schemas } : {}),
  }
}
