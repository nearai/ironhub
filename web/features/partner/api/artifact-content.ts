"use client"

import { useQuery } from "@tanstack/react-query"

import type { ContentKind } from "./artifacts"
import { ApiError } from "./client"

async function fetchTextContent(url: string): Promise<string> {
  const response = await fetch(url)

  if (!response.ok) {
    let message = response.statusText || `Request failed with status ${response.status}`
    try {
      const body = await response.clone().json()
      if (body && typeof body.error === "string") message = body.error
    } catch {
      // Response wasn't JSON (e.g. a plain-text 404) -- fall back to statusText above.
    }
    throw new ApiError(response.status, message)
  }

  return response.text()
}

/**
 * Reads an artifact's stored text content (`skill_md`, `capabilities`)
 * through the owner-facing read route (`GET .../content/[kind]`, no install
 * token needed) so an edit page can seed its editor from what is actually
 * stored, instead of starting blank and silently overwriting it on save.
 *
 * Any non-2xx response -- including 404 -- surfaces as `isError`. A skill or
 * tool that completed creation always has this content, so a missing row
 * means something is genuinely wrong; treating it as "no content, start
 * blank" would defeat the point of this route, which is that a save must
 * never destroy something the editor never actually saw.
 */
export function useArtifactTextContent(
  id: string | undefined,
  kind: Extract<ContentKind, "skill_md" | "capabilities">
) {
  return useQuery({
    queryKey: ["private-artifact-content", id, kind],
    queryFn: () => fetchTextContent(`/api/private-artifacts/${id}/content/${kind}`),
    enabled: Boolean(id),
    retry: false,
  })
}
