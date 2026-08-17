"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiError, fetchJson, uploadContent } from "./client"

export type ArtifactType = "tool" | "skill"
export type ArtifactVisibility = "private" | "public"
export type ArtifactStatus = "draft" | "published"
export type ContentKind =
  | "wasm"
  | "capabilities"
  | "skill_md"
  | "manifest_toml"
  | "bundle_zip"

/** Content summary as returned by the artifact list/detail read routes — never the storageKey. */
export interface ArtifactContent {
  kind: ContentKind
  sha256: string
  sizeBytes: number
  createdAt: string
}

export interface PrivateArtifact {
  id: string
  organizationId: string
  createdById: string | null
  type: ArtifactType
  name: string
  title: string
  version: string
  visibility: ArtifactVisibility
  status: ArtifactStatus
  category: string | null
  description: string | null
  sourceUrl: string | null
  content: ArtifactContent[]
  createdAt: string
  updatedAt: string
}

export interface CreateArtifactInput {
  type: ArtifactType
  name: string
  title: string
  version: string
  visibility?: ArtifactVisibility
  description?: string
  sourceUrl?: string | null
  category?: string | null
}

export type UpdateArtifactInput = Partial<
  Pick<
    CreateArtifactInput,
    "title" | "description" | "visibility" | "sourceUrl" | "category"
  >
>

/** Parsed manifest.toml fields returned by bundle inspect/upload (design.md D6). */
export interface BundleManifest {
  schemaVersion?: string
  id: string
  name: string
  version: string
  description: string
  trust?: string
  runtimeKind?: string
  runtimeModule?: string
}

export interface InspectedBundleFiles {
  wasm: string
  // null when the archive carries no root *.capabilities.json — that's a
  // legitimate state now that manifest.toml owns the data it used to carry
  // (design.md D3/D6), not a broken or incomplete inspect result.
  capabilities: string | null
  schemas: string[]
  prompts: string[]
}

export interface InspectedBundle {
  manifest: BundleManifest
  files: InspectedBundleFiles
  totalUncompressedBytes: number
}

/** design.md D6's bundle-upload response omits `createdAt` — the row hasn't been re-fetched, just written. */
export interface BundleContentSummary {
  kind: ContentKind
  sha256: string
  sizeBytes: number
}

export interface BundleUploadResult {
  content: BundleContentSummary[]
}

export interface ArtifactCheck {
  id: string
  label: string
  status: "pass" | "warn" | "fail"
  detail: string
}

export interface ArtifactChecksResult {
  checks: ArtifactCheck[]
  publishable: boolean
}

const artifactsKey = ["private-artifacts"] as const
const artifactKey = (id: string) => ["private-artifacts", id] as const
const artifactChecksKey = (id: string) => ["private-artifacts", id, "checks"] as const

export function useArtifacts() {
  return useQuery({
    queryKey: artifactsKey,
    queryFn: () =>
      fetchJson<{ artifacts: PrivateArtifact[] }>("/api/private-artifacts"),
    // Defensive: tolerate a missing/empty content array from the API.
    select: (data) =>
      data.artifacts.map((artifact) => ({ ...artifact, content: artifact.content ?? [] })),
  })
}

export function useArtifact(id: string | undefined) {
  return useQuery({
    queryKey: id ? artifactKey(id) : ["private-artifacts", "unknown"],
    queryFn: () =>
      fetchJson<{ artifact: PrivateArtifact }>(`/api/private-artifacts/${id}`),
    // Defensive: tolerate a missing/empty content array from the API.
    select: (data) => ({ ...data.artifact, content: data.artifact.content ?? [] }),
    enabled: Boolean(id),
  })
}

export function useCreateArtifact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateArtifactInput) =>
      fetchJson<{ artifact: PrivateArtifact }>("/api/private-artifacts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
    },
  })
}

export function useUpdateArtifact(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateArtifactInput) =>
      fetchJson<{ artifact: PrivateArtifact }>(`/api/private-artifacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.invalidateQueries({ queryKey: artifactKey(id) })
    },
  })
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<void>(`/api/private-artifacts/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.removeQueries({ queryKey: artifactKey(id) })
    },
  })
}

export function useUploadArtifactContent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, file }: { kind: ContentKind; file: Blob }) =>
      uploadContent(`/api/private-artifacts/${id}/content/${kind}`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.invalidateQueries({ queryKey: artifactKey(id) })
    },
  })
}

export function useDeleteArtifactContent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (kind: ContentKind) =>
      fetchJson<void>(`/api/private-artifacts/${id}/content/${kind}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.invalidateQueries({ queryKey: artifactKey(id) })
    },
  })
}

export function useMintInstallToken(id: string) {
  return useMutation({
    mutationFn: () =>
      fetchJson<{ token: string; manifestUrl: string }>(
        `/api/private-artifacts/${id}/token`,
        { method: "POST" }
      ),
  })
}

/**
 * Inspects a candidate extension zip without persisting anything
 * (design.md D6). Used by the new-submit tool tab to validate the archive
 * and prefill metadata from its manifest.toml before the artifact exists.
 */
export function useInspectBundle() {
  return useMutation({
    mutationFn: (bytes: Blob) =>
      fetchJson<InspectedBundle>("/api/private-artifacts/bundle/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: bytes,
      }),
  })
}

/**
 * Stores a validated extension bundle against a tool artifact (design.md D6).
 * The target `id` is passed per-call rather than bound at hook-creation time,
 * so a single call site can serve both the create flow (the id isn't known
 * until after `useCreateArtifact` resolves) and a re-upload flow on the
 * manage page (the id is stable but the hook still needs to be declared
 * unconditionally at the top of the component).
 */
export function useUploadArtifactBundle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bytes }: { id: string; bytes: Blob }) =>
      fetchJson<BundleUploadResult>(`/api/private-artifacts/${id}/bundle`, {
        method: "PUT",
        headers: { "Content-Type": "application/zip" },
        body: bytes,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.invalidateQueries({ queryKey: artifactKey(id) })
      queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) })
    },
  })
}

/** Review checks for the manage page (design.md D8) — never invent checks client-side. */
export function useArtifactChecks(id: string | undefined) {
  return useQuery({
    queryKey: id ? artifactChecksKey(id) : ["private-artifacts", "unknown", "checks"],
    queryFn: () =>
      fetchJson<ArtifactChecksResult>(`/api/private-artifacts/${id}/checks`),
    // Defensive: tolerate a missing checks array from the API.
    select: (data) => ({ ...data, checks: data.checks ?? [] }),
    enabled: Boolean(id),
  })
}

export function usePublishArtifact(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchJson<{ artifact: PrivateArtifact }>(`/api/private-artifacts/${id}/publish`, {
        method: "POST",
      }),
    // Awaited so callers that show a success toast after `mutateAsync`
    // resolves see it land only once the cached artifact/checks have
    // actually refetched — otherwise the toast can appear before the
    // status badge updates.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: artifactsKey }),
        queryClient.invalidateQueries({ queryKey: artifactKey(id) }),
        queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) }),
      ]),
  })
}

export function useUnpublishArtifact(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchJson<{ artifact: PrivateArtifact }>(`/api/private-artifacts/${id}/unpublish`, {
        method: "POST",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: artifactsKey }),
        queryClient.invalidateQueries({ queryKey: artifactKey(id) }),
        queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) }),
      ]),
  })
}

/**
 * Routes a create/update save error to the specific field it names (D1's
 * `Invalid category: <value>`, D2's `sourceUrl must be...`) or a generic
 * form-level message otherwise. Extracted so each save handler's catch block
 * can make one additive call instead of branching inline ahead of its
 * existing `error instanceof ApiError` handling — the edit pages' catch
 * blocks are also touched by wt-content-read's content-loading work, so
 * keeping this logic out of them keeps that merge mechanical.
 */
export function describeArtifactSaveError(error: unknown): {
  field: "category" | "sourceUrl" | null
  message: string
} {
  if (error instanceof ApiError) {
    if (error.status === 400 && /^Invalid category:/.test(error.message)) {
      return { field: "category", message: error.message }
    }
    if (/sourceUrl must be/.test(error.message)) {
      return { field: "sourceUrl", message: error.message }
    }
    return {
      field: null,
      message: error.status === 409 ? `Duplicate: ${error.message}` : error.message,
    }
  }
  return {
    field: null,
    message: error instanceof Error ? error.message : "Something went wrong.",
  }
}
