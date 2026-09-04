// Path-addressed schema and prompt assets for a private tool artifact.
//
// The sibling of content.ts, and deliberately not part of it. A content row is
// one per kind (`wasm`, `manifest_toml`, ...); an asset row is many per kind,
// addressed by the path the extension manifest spells. The agent bounds and
// matches the two asset classes independently -- it requires the set of paths
// the manifest references to be *exactly* the set published, per class -- so
// path is the identity here, not an afterthought on a kind.
//
// This module is the authoritative guard for both agent limits that apply to
// assets: the per-asset byte ceiling and the per-tool count ceiling. Bundle
// ingest checks the same rules earlier, against the archive, so an author gets
// a message naming the offending file rather than a generic one -- that is a
// better error, not a substitute. Neither check may be relaxed on the
// assumption that the other ran.
import { createHash, randomUUID } from "node:crypto"

import {
  MAX_METADATA_BYTES,
  MAX_TOOL_PROMPT_ARTIFACTS,
  MAX_TOOL_SCHEMA_ARTIFACTS,
  isExtensionAssetPath,
} from "@/lib/catalog/ironclaw-contract"

import { prisma } from "../db"
import { deleteObject, putObject } from "../storage"
import {
  PUBLISH_FREEZE_SELECT,
  assertArtifactContentUnfrozen,
} from "./publish-freeze"

const ASSET_KINDS = ["schema", "prompt"] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export const ASSET_MEDIA_TYPES: Record<AssetKind, string> = {
  schema: "application/json",
  prompt: "text/markdown; charset=utf-8",
}

/**
 * Both classes share the agent's metadata ceiling -- `validate_manifest_artifacts`
 * passes `MAX_METADATA_BYTES` for a schema and for a prompt alike.
 */
export const MAX_ASSET_BYTES = MAX_METADATA_BYTES

export const MAX_ASSETS_BY_KIND: Record<AssetKind, number> = {
  schema: MAX_TOOL_SCHEMA_ARTIFACTS,
  prompt: MAX_TOOL_PROMPT_ARTIFACTS,
}

export type ArtifactAssetInput = {
  kind: AssetKind
  path: string
  bytes: Uint8Array
}

export type StoredArtifactAsset = {
  kind: AssetKind
  path: string
  sha256: string
  sizeBytes: number
}

export function parseAssetKind(value: string): AssetKind {
  if (!(ASSET_KINDS as readonly string[]).includes(value)) {
    throw new Response(`Invalid asset kind: ${value}`, { status: 400 })
  }
  return value as AssetKind
}

/**
 * Mirrors `artifactContentStorageKey`'s layout and extends it with the asset
 * dimension. The `assets/` segment keeps the two namespaces disjoint without
 * relying on the set of content kinds staying free of a name collision: a
 * content key ends at its kind, an asset key continues past `assets/`.
 *
 * The declared path is interpolated verbatim, which is only safe because
 * `isExtensionAssetPath` has already rejected traversal, empty segments, and
 * every character outside `[A-Za-z0-9._/-]`. Every write path below validates
 * before building a key.
 */
export function artifactAssetStorageKey(
  organizationId: string,
  artifactId: string,
  kind: AssetKind,
  path: string
): string {
  return `private-artifacts/${organizationId}/${artifactId}/assets/${kind}/${path}`
}

function assertPublishablePath(path: string) {
  if (!isExtensionAssetPath(path)) {
    throw new Response(`Invalid asset path: ${path}`, { status: 400 })
  }
}

function assertWithinSizeLimit(path: string, byteLength: number) {
  if (byteLength > MAX_ASSET_BYTES) {
    throw new Response(
      `Asset ${path} exceeds the ${MAX_ASSET_BYTES / (1024 * 1024)}MB limit for a single asset`,
      { status: 413 }
    )
  }
}

// Proves the artifact is the caller organization's, and that its files may
// still be changed. The freeze lives in this one helper rather than at each
// call site because storing an asset and deleting one alter what a published
// version resolves to in exactly the same way -- there is no call site here
// that could want a different answer.
async function requireWritableArtifact(
  organizationId: string,
  artifactId: string
) {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: artifactId, organizationId },
    select: PUBLISH_FREEZE_SELECT,
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }
  assertArtifactContentUnfrozen(artifact)
  return artifact
}

// Writes one asset's bytes and row. Assumes the caller has already proved the
// artifact belongs to the org and validated the input -- `replaceArtifactAssets`
// validates the whole set up front so a rejected member cannot leave a
// half-written set behind, which is why validation does not live here.
async function writeAsset(
  organizationId: string,
  artifactId: string,
  input: ArtifactAssetInput
): Promise<StoredArtifactAsset> {
  const bytes = new Uint8Array(input.bytes)
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const storageKey = artifactAssetStorageKey(
    organizationId,
    artifactId,
    input.kind,
    input.path
  )

  await putObject(storageKey, bytes, ASSET_MEDIA_TYPES[input.kind])

  const fields = { storageKey, sha256, sizeBytes: bytes.length }
  await prisma.privateArtifactAsset.upsert({
    where: {
      artifactId_kind_path: {
        artifactId,
        kind: input.kind,
        path: input.path,
      },
    },
    update: fields,
    create: {
      id: randomUUID(),
      artifactId,
      kind: input.kind,
      path: input.path,
      ...fields,
    },
    select: { id: true },
  })

  return { kind: input.kind, path: input.path, sha256, sizeBytes: bytes.length }
}

/**
 * Makes the stored asset set for an artifact exactly `assets`.
 *
 * The only write API here, and deliberately the only one. A "store one asset"
 * convenience existed briefly and was removed: it could validate a path and a
 * byte length, but the per-tool count caps are a property of the *set*, so a
 * per-asset call either re-derives them from a second query or -- as it did --
 * skips them, leaving a caller one line away from storing a 33rd schema. The
 * set-shaped operation is also the one the agent's contract is written in
 * (C9 compares sets, in both directions), so making it the only shape means a
 * caller cannot express the half-update that breaks it.
 *
 * This is the shape ingest needs: a re-uploaded bundle that renamed or dropped
 * a schema must not leave the old one behind, because the agent rejects a
 * published asset the extension manifest does not reference just as hard as it
 * rejects a missing one. Upserting alone would satisfy the "missing" half and
 * quietly break the other.
 *
 * The whole set is validated before anything is written, so a rejection leaves
 * the previous set intact rather than a partially replaced one.
 */
export async function replaceArtifactAssets(
  organizationId: string,
  artifactId: string,
  assets: ArtifactAssetInput[]
): Promise<StoredArtifactAsset[]> {
  const seen = new Set<string>()
  const countByKind: Record<AssetKind, number> = { schema: 0, prompt: 0 }

  for (const asset of assets) {
    assertPublishablePath(asset.path)
    assertWithinSizeLimit(asset.path, asset.bytes.length)
    const identity = `${asset.kind}\0${asset.path}`
    if (seen.has(identity)) {
      throw new Response(`Duplicate ${asset.kind} asset path: ${asset.path}`, {
        status: 400,
      })
    }
    seen.add(identity)
    countByKind[asset.kind] += 1
  }

  for (const kind of ASSET_KINDS) {
    const limit = MAX_ASSETS_BY_KIND[kind]
    if (countByKind[kind] > limit) {
      throw new Response(
        `Tool publishes ${countByKind[kind]} ${kind} assets; the agent accepts at most ${limit}`,
        { status: 400 }
      )
    }
  }

  await requireWritableArtifact(organizationId, artifactId)

  const stored: StoredArtifactAsset[] = []
  for (const asset of assets) {
    stored.push(await writeAsset(organizationId, artifactId, asset))
  }

  await pruneAssetsOutside(organizationId, artifactId, seen)
  return stored
}

// Deletes every stored asset whose (kind, path) identity is not in `keep`.
// Runs after the writes, not before: a failed write then leaves the previous
// set in place rather than an empty one.
async function pruneAssetsOutside(
  organizationId: string,
  artifactId: string,
  keep: ReadonlySet<string>
) {
  const existing = await prisma.privateArtifactAsset.findMany({
    where: { artifactId, artifact: { organizationId } },
    select: { id: true, kind: true, path: true, storageKey: true },
  })

  for (const asset of existing) {
    if (keep.has(`${asset.kind}\0${asset.path}`)) continue
    await prisma.privateArtifactAsset.delete({ where: { id: asset.id } })
    await deleteStorageObject(asset.id, asset.storageKey)
  }
}

// Storage deletion is best-effort, matching deleteArtifactContent: the row is
// the source of truth for what is published, so an orphaned object is waste,
// not a correctness problem, and must not fail the request that removed it.
async function deleteStorageObject(assetId: string, storageKey: string) {
  try {
    await deleteObject(storageKey)
  } catch (error) {
    console.error(
      `Failed to delete storage object for asset ${assetId} (${storageKey})`,
      error
    )
  }
}

export async function listArtifactAssets(
  organizationId: string,
  artifactId: string
) {
  return prisma.privateArtifactAsset.findMany({
    where: { artifactId, artifact: { organizationId } },
    select: {
      kind: true,
      path: true,
      storageKey: true,
      sha256: true,
      sizeBytes: true,
    },
    orderBy: [{ kind: "asc" }, { path: "asc" }],
  })
}

export async function getArtifactAssetMetadata(
  organizationId: string,
  artifactId: string,
  kind: AssetKind,
  path: string
) {
  const asset = await prisma.privateArtifactAsset.findFirst({
    where: { artifactId, kind, path, artifact: { organizationId } },
    select: { storageKey: true, sha256: true, sizeBytes: true },
  })
  if (!asset) {
    throw new Response("Asset not found", { status: 404 })
  }
  return asset
}

export async function deleteArtifactAsset(
  organizationId: string,
  artifactId: string,
  kind: AssetKind,
  path: string
) {
  await requireWritableArtifact(organizationId, artifactId)

  const asset = await prisma.privateArtifactAsset.findFirst({
    where: { artifactId, kind, path, artifact: { organizationId } },
    select: { id: true, storageKey: true },
  })
  if (!asset) {
    throw new Response("Asset not found", { status: 404 })
  }

  await prisma.privateArtifactAsset.delete({ where: { id: asset.id } })
  await deleteStorageObject(asset.id, asset.storageKey)
}
