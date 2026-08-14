// integration: real implementation lands from wt-storage
//
// This is a placeholder stub so that other worktrees (wt-artifact-api) can
// typecheck against the S3 storage lib contract described in
// openspec/changes/add-private-workspace/design.md (D1) before the real
// implementation (backed by @aws-sdk/client-s3) lands from wt-storage.
//
// Signatures here are the integration contract; do not add behavior beyond
// no-op logging. The merge agent will replace this file with the real
// implementation.

/* eslint-disable @typescript-eslint/no-unused-vars */

export async function putObject(
  key: string,
  body: Uint8Array
): Promise<{ key: string; sha256: string; sizeBytes: number }> {
  throw new Error("storage.putObject is not implemented in this worktree")
}

export async function getObjectStream(key: string): Promise<ReadableStream> {
  throw new Error("storage.getObjectStream is not implemented in this worktree")
}

export async function deleteObject(key: string): Promise<void> {
  // integration: real implementation lands from wt-storage
  console.warn(`[storage stub] deleteObject(${key}) is a no-op in this worktree`)
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  // integration: real implementation lands from wt-storage
  console.warn(`[storage stub] deleteByPrefix(${prefix}) is a no-op in this worktree`)
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number
): Promise<string> {
  throw new Error(
    "storage.getPresignedDownloadUrl is not implemented in this worktree"
  )
}
