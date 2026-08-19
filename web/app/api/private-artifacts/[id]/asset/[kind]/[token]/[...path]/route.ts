// The agent-facing read path for a path-addressed schema or prompt asset.
//
// The sibling of `../../../content/[kind]/[token]`, split off because these
// assets are addressed differently: a content row is one per kind, an asset is
// one per (kind, path), and the path is the identity the agent matches on. It
// carries the same C5 prohibition -- never redirect, always relay -- and the
// same C6 byte-exactness, both enforced by the shared `relayStoredObject`.
//
// The declared path is the trailing catch-all, spelled exactly as the
// extension manifest spells it and exactly as the manifest URL publishes it.
// No encoding step sits between the three, which is only safe because the
// grammar (`isExtensionAssetPath`) is a subset of the unreserved URL path
// characters: every accepted path survives a percent-decode unchanged, so the
// path this route reconstructs is byte-identical to the published key. A
// request carrying anything else fails the grammar below rather than being
// normalized into something that might match a stored row.
import {
  MAX_TOOL_PROMPT_ARTIFACTS,
  MAX_TOOL_SCHEMA_ARTIFACTS,
  isExtensionAssetPath,
} from "@/lib/catalog/ironclaw-contract"
import { handleApiError } from "@/lib/http/api"
import {
  createRateLimiter,
  rateLimitExceededResponse,
  resolveClientIp,
} from "@/lib/http/rate-limit"
import {
  ASSET_MEDIA_TYPES,
  getArtifactAssetMetadata,
  parseAssetKind,
} from "@/lib/private-artifacts/assets"
import { relayStoredObject } from "@/lib/private-artifacts/relay"
import { verifyArtifactToken } from "@/lib/private-artifacts/token"

type Params = {
  params: Promise<{ id: string; kind: string; token: string; path: string[] }>
}

// Sized from the contract rather than picked: the agent downloads artifacts
// sequentially, one request per published asset (C17), so a tool at both caps
// legitimately issues MAX_TOOL_SCHEMA_ARTIFACTS + MAX_TOOL_PROMPT_ARTIFACTS
// requests through this route for a single install. The content route's 30 is
// right for its four kinds and would abort a large install here. Doubled to
// leave room for the agent's own retries without leaving the budget open --
// this is still one client, one token, one minute.
const MAX_ASSET_DOWNLOADS_PER_INSTALL =
  MAX_TOOL_SCHEMA_ARTIFACTS + MAX_TOOL_PROMPT_ARTIFACTS

const checkRateLimit = createRateLimiter({
  limit: MAX_ASSET_DOWNLOADS_PER_INSTALL * 2,
  windowMs: 60_000,
})

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, kind, token, path } = await params

    const rateLimit = checkRateLimit(
      `asset:${resolveClientIp(request)}:${token}`
    )
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
    }

    const assetKind = parseAssetKind(kind)
    const assetPath = (path ?? []).join("/")
    if (!isExtensionAssetPath(assetPath)) {
      throw new Response(`Invalid asset path: ${assetPath}`, { status: 400 })
    }

    const claims = verifyArtifactToken(token)
    if (claims.artifactId !== id) {
      throw new Response("Token does not match artifact", { status: 403 })
    }

    const asset = await getArtifactAssetMetadata(
      claims.organizationId,
      id,
      assetKind,
      assetPath
    )

    return await relayStoredObject({
      storageKey: asset.storageKey,
      sizeBytes: asset.sizeBytes,
      contentType: ASSET_MEDIA_TYPES[assetKind],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
