"use client"

import { useQuery } from "@tanstack/react-query"

import type { ContentKind } from "./artifacts"
import { ApiError } from "./client"

async function fetchTextContent(url: string): Promise<string> {
  const response = await fetch(url)

  if (response.status === 404) {
    // No content row exists yet for this artifact/kind. This is a real,
    // recoverable state -- e.g. a content upload that failed partway
    // through creation -- and it is the *only* place that content can ever
    // be supplied, since there is no other upload affordance on the manage
    // page. Treating it as a load failure would make the artifact
    // permanently uneditable: save blocked because content "failed to
    // load", but the content can never be created either. So: resolve to
    // an empty document, the safe starting point, rather than throwing.
    return ""
  }

  if (!response.ok) {
    let message = response.statusText || `Request failed with status ${response.status}`
    try {
      const body = await response.clone().json()
      if (body && typeof body.error === "string") message = body.error
    } catch {
      // Response wasn't JSON (e.g. a plain-text 500) -- fall back to statusText above.
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
 * A 404 resolves successfully to `""` (see `fetchTextContent`) rather than
 * surfacing as `isError` -- callers should treat `data !== undefined` as
 * "safe to edit and save", regardless of whether that data is a real stored
 * file or the empty string for one that was never created. Only a genuine
 * failure (network error, 5xx, ...) should surface as `isError`.
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
