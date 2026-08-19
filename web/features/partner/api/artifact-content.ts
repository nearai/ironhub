"use client"

import { useQuery } from "@tanstack/react-query"

import type { ContentKind } from "./artifacts"
import { ApiError } from "./client"

/**
 * `undefined` (react-query's own "no data yet") means "still loading, never
 * obtained a value" -- distinct from `null`, the sentinel this module uses
 * for "we asked, and there is confirmedly no content row yet". A genuinely
 * stored empty file (`data === ""`) is a third, different state and must
 * not be confused with either.
 */
type TextContentResult = string | null

async function fetchTextContent(url: string): Promise<TextContentResult> {
  const response = await fetch(url)

  if (response.status === 404) {
    // No content row exists yet for this artifact/kind. This is a real,
    // recoverable state -- e.g. a content upload that failed partway
    // through creation -- and it is the *only* place that content can ever
    // be supplied, since there is no other upload affordance on the manage
    // page. Resolve to the `null` sentinel (not `""`, which would be
    // indistinguishable from a genuinely stored empty file) so callers can
    // show "nothing stored yet, saving will create it" and allow the save,
    // rather than either silently defaulting *or* treating this as an
    // unrecoverable failure.
    return null
  }

  if (!response.ok) {
    let message =
      response.statusText || `Request failed with status ${response.status}`
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
 * `data` is one of three states once settled:
 * - `string` -- the stored file's bytes (may be `""` if it was genuinely
 *   saved empty).
 * - `null` -- no content row exists yet (404). Safe to edit and save; a
 *   save will create the file.
 * - still `undefined` -- never obtained a value (loading, or every attempt
 *   failed). Callers should block saving here and only here: HTTP statuses
 *   other than 404 keep surfacing as `isError` with no `data`, which is
 *   the one state that should not be savable over.
 *
 * Callers should therefore gate "safe to save" on `data !== undefined`,
 * not on `isSuccess`/`isError` directly -- those flip on a later failed
 * background refetch even while `data` (correctly) stays populated.
 */
export function useArtifactTextContent(
  id: string | undefined,
  kind: Extract<ContentKind, "skill_md" | "capabilities">
) {
  return useQuery({
    queryKey: ["private-artifact-content", id, kind],
    queryFn: () =>
      fetchTextContent(`/api/private-artifacts/${id}/content/${kind}`),
    enabled: Boolean(id),
    retry: false,
  })
}
