"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchJson, uploadContent } from "./client"

export type ArtifactType = "tool" | "skill"
export type ArtifactVisibility = "private" | "public"
export type ContentKind = "wasm" | "capabilities" | "skill_md"

export interface ArtifactContent {
  id: string
  artifactId: string
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
  status: string
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
}

export type UpdateArtifactInput = Partial<
  Pick<CreateArtifactInput, "title" | "description" | "visibility" | "sourceUrl">
>

const artifactsKey = ["private-artifacts"] as const
const artifactKey = (id: string) => ["private-artifacts", id] as const

export function useArtifacts() {
  return useQuery({
    queryKey: artifactsKey,
    queryFn: () =>
      fetchJson<{ artifacts: PrivateArtifact[] }>("/api/private-artifacts"),
    select: (data) => data.artifacts,
  })
}

export function useArtifact(id: string | undefined) {
  return useQuery({
    queryKey: id ? artifactKey(id) : ["private-artifacts", "unknown"],
    queryFn: () =>
      fetchJson<{ artifact: PrivateArtifact }>(`/api/private-artifacts/${id}`),
    select: (data) => data.artifact,
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
