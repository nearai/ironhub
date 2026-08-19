// Rewriting one upstream `tools.json` entry into a published catalog entry.
//
// The shape comes from `hubToolEntry`, which the private builder also uses --
// that convergence is the point (see hub-entry.ts). What stays here is the
// policy this path needs and the private one does not: where an artifact URL
// comes from (a proxy token over an upstream GitHub URL, not a hub-stored
// object), and what to do about a tool whose asset set the agent will refuse.
//
// That second decision is the one this file used to get wrong. It dropped
// assets past the agent's caps with a `console.error` and published the rest,
// which reads like graceful degradation and is not: C9 makes the agent compare
// the published asset set against the set the extension manifest declares and
// reject the install unless they are *equal*. A trimmed entry is therefore
// guaranteed to fail install, and it fails looking like a hub that worked.
// `crates/extensions/packages/github` has 50 schema refs against a cap of 32,
// so this was live behaviour, not a hypothetical (design.md D5).
//
// The replacement omits the whole tool and logs it. Not a hard failure,
// because this manifest is assembled from a `tools.json` fetched from an
// external GitHub release at request time (`force-dynamic`): failing the
// request would let one bad upstream entry take the entire public catalog
// endpoint down, which is the wrong availability trade for a document we do
// not control. One tool disappears, everything else serves, and the log line
// names the tool, the kind, and the limit so it can be alerted on.
// Relative with an explicit extension, matching hub-entry.ts: the
// `test:catalog` suite runs plain `node --test` without the alias loader, so a
// runtime `@/` import here would not resolve.
import { hubToolEntry } from "./hub-entry.ts"
import {
  MAX_TOOL_PROMPT_ARTIFACTS,
  MAX_TOOL_SCHEMA_ARTIFACTS,
  isExtensionAssetPath,
} from "./ironclaw-contract.ts"
import type { HubArtifact, HubToolEntry } from "./manifest-types.ts"

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
  prompts?: Record<string, GithubArtifact> | null
}

const ASSET_LIMITS = {
  schema: MAX_TOOL_SCHEMA_ARTIFACTS,
  prompt: MAX_TOOL_PROMPT_ARTIFACTS,
} as const

type AssetKind = keyof typeof ASSET_LIMITS

/**
 * `null` when the tool cannot be published as the agent would need it. The
 * caller drops it from the manifest and serves the rest.
 */
export function officialToolEntry(
  tool: GithubTool,
  artifactUrl: (upstreamUrl: string) => string
): HubToolEntry | null {
  const rewrite = (artifact: GithubArtifact): HubArtifact => ({
    url: artifactUrl(artifact.url),
    size_bytes: artifact.size_bytes,
    sha256: artifact.sha256,
  })

  const schemas = publishableAssets(tool, "schema", tool.schemas, rewrite)
  const prompts = publishableAssets(tool, "prompt", tool.prompts, rewrite)
  if (schemas === null || prompts === null) {
    return null
  }

  return hubToolEntry({
    name: tool.name,
    crateName: tool.crate_name,
    version: tool.version,
    description: tool.description,
    provenance: "official",
    wasm: rewrite(tool.wasm),
    capabilities: rewrite(tool.capabilities),
    manifest: tool.manifest ? rewrite(tool.manifest) : null,
    schemas,
    prompts,
  })
}

/**
 * The whole upstream tool list, minus the tools that cannot be published.
 *
 * The omission decision belongs here rather than at the call site so that
 * "some tools may be missing" is a property of this module rather than a rule
 * a caller has to remember. There is no failure mode: an empty list in means
 * an empty list out, and every unpublishable tool costs exactly itself.
 */
export function officialToolEntries(
  tools: readonly GithubTool[],
  artifactUrl: (upstreamUrl: string) => string
): HubToolEntry[] {
  return tools.flatMap((tool) => {
    const entry = officialToolEntry(tool, artifactUrl)
    return entry ? [entry] : []
  })
}

/**
 * `null` means "this tool is not publishable", never "publish what fits".
 *
 * Both rejections below are the same defect wearing two hats -- publishing a
 * proper subset of what the tool declares -- so both produce the same answer.
 * The path rule is the stricter of the two: `ExtensionAssetPath` would accept
 * a space or a colon (C19) and the hub's grammar does not, so a tool can be
 * dropped here for a path the agent would have tolerated. That is deliberate
 * and it is why the log line says what was wrong: the alternative is
 * publishing an entry without that asset, which the agent refuses outright.
 */
function publishableAssets(
  tool: GithubTool,
  kind: AssetKind,
  assets: Record<string, GithubArtifact> | null | undefined,
  rewrite: (artifact: GithubArtifact) => HubArtifact
): Record<string, HubArtifact> | null {
  const entries = Object.entries(assets ?? {})

  const unpublishable = entries.find(([path]) => !isExtensionAssetPath(path))
  if (unpublishable) {
    console.error(
      `Omitting tool ${tool.name} from the published manifest: ${kind} path "${unpublishable[0]}" is outside the publishable path grammar, and publishing the tool without it would fail the agent's asset-set equality check`
    )
    return null
  }

  const limit = ASSET_LIMITS[kind]
  if (entries.length > limit) {
    console.error(
      `Omitting tool ${tool.name} from the published manifest: it declares ${entries.length} ${kind} artifacts against the agent's limit of ${limit}, and a truncated entry cannot install`
    )
    return null
  }

  return Object.fromEntries(
    entries.map(([path, artifact]) => [path, rewrite(artifact)])
  )
}
