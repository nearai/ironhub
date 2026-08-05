import { promises as fs } from "node:fs"
import path from "node:path"

const MAX_REPOSITORY_IMAGE_BYTES = 5 * 1024 * 1024

const IMAGE_CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
])

type RepositoryAssetKind = "tool" | "skill"

export type RepositoryImageAsset = {
  bytes: Uint8Array
  contentType: string
}

export async function readRepositoryImageAsset(
  repoRoot: string,
  kind: string,
  slug: string,
  assetPath: string[]
): Promise<RepositoryImageAsset | null> {
  if (!isRepositoryAssetKind(kind) || !isSafeSlug(slug)) return null
  if (assetPath.length === 0 || assetPath.some((part) => !isSafePart(part))) {
    return null
  }

  const contentType = IMAGE_CONTENT_TYPES.get(
    path.extname(assetPath.at(-1) ?? "").toLowerCase()
  )
  if (!contentType) return null

  const collection = kind === "tool" ? "tools" : "skills"
  const declaredRoot = path.join(repoRoot, collection, slug)

  try {
    const artifactRoot = await fs.realpath(declaredRoot)
    const declaredAsset = path.resolve(artifactRoot, ...assetPath)

    if (!isContainedPath(artifactRoot, declaredAsset)) return null

    const resolvedAsset = await fs.realpath(declaredAsset)
    if (!isContainedPath(artifactRoot, resolvedAsset)) return null

    const stat = await fs.stat(resolvedAsset)
    if (!stat.isFile() || stat.size > MAX_REPOSITORY_IMAGE_BYTES) return null

    return {
      bytes: new Uint8Array(await fs.readFile(resolvedAsset)),
      contentType,
    }
  } catch {
    return null
  }
}

function isRepositoryAssetKind(value: string): value is RepositoryAssetKind {
  return value === "tool" || value === "skill"
}

function isSafeSlug(value: string) {
  return /^[a-z0-9][a-z0-9_-]*$/i.test(value)
}

function isSafePart(value: string) {
  return (
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes("\0")
  )
}

function isContainedPath(root: string, candidate: string) {
  const relative = path.relative(root, candidate)
  return (
    relative.length > 0 &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  )
}
