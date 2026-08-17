"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchJson, fetchText, uploadContent } from "./client"

export type ArtifactType = "tool" | "skill"
export type ArtifactVisibility = "private" | "public"
export type ArtifactStatus = "draft" | "published"
export type ContentKind =
  | "wasm"
  | "capabilities"
  | "skill_md"
  | "manifest_toml"
  | "bundle_zip"

/** Content kinds the owner content-read route streams inline as text (design.md D4). */
export type TextContentKind = "skill_md" | "capabilities" | "manifest_toml"

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
  sourceUrl?: string
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
  capabilities: string
  schemas: string[]
  prompts: string[]
}

export interface InspectedBundle {
  manifest: BundleManifest
  files: InspectedBundleFiles
  totalUncompressedBytes: number
}

export interface BundleUploadResult {
  content: ArtifactContent[]
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

/**
 * Owner-facing read of a text content kind (design.md D4). Binary kinds
 * (`wasm`, `bundle_zip`) redirect to a presigned URL server-side rather than
 * streaming inline, so they are not exposed through this hook — link to the
 * route directly for those instead.
 */
export function useArtifactContent(id: string | undefined, kind: TextContentKind) {
  return useQuery({
    queryKey: id
      ? ([...artifactKey(id), "content", kind] as const)
      : (["private-artifacts", "unknown", "content", kind] as const),
    queryFn: () =>
      fetchText(`/api/private-artifacts/${id}/content/${kind}`, {
        cache: "no-store",
      }),
    enabled: Boolean(id),
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
 * Stores a validated extension bundle against an existing tool artifact
 * (design.md D6). Bound to a known artifact id, so it's meant for re-upload
 * flows on an existing artifact — the create flow uploads the first bundle
 * with the raw `uploadContent`-style call once the artifact id is known,
 * mirroring how `useUploadArtifactContent` is not used for the initial
 * content upload on create either.
 */
export function useUploadArtifactBundle(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bytes: Blob) =>
      fetchJson<BundleUploadResult>(`/api/private-artifacts/${id}/bundle`, {
        method: "PUT",
        headers: { "Content-Type": "application/zip" },
        body: bytes,
      }),
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.invalidateQueries({ queryKey: artifactKey(id) })
      queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) })
    },
  })
}

export function useUnpublishArtifact(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchJson<{ artifact: PrivateArtifact }>(`/api/private-artifacts/${id}/unpublish`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey })
      queryClient.invalidateQueries({ queryKey: artifactKey(id) })
      queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) })
    },
  })
}
