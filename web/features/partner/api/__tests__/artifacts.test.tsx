import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  describeArtifactSaveError,
  useArtifactChecks,
  useArtifacts,
  useCreateArtifact,
  useInspectBundle,
  usePublishArtifact,
  useUploadArtifactBundle,
} from "../artifacts"
import { ApiError } from "../client"

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("artifacts API hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fetches the artifact list for the active organization", async () => {
    const artifacts = [
      {
        id: "a1",
        organizationId: "org1",
        createdById: "u1",
        type: "tool",
        name: "usdc-payments",
        title: "USDC Payments",
        version: "1.0.0",
        visibility: "private",
        status: "draft",
        description: null,
        sourceUrl: null,
        content: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ artifacts }), { status: 200 })
    )

    const { result } = renderHook(() => useArtifacts(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(artifacts)
    expect(fetch).toHaveBeenCalledWith(
      "/api/private-artifacts",
      expect.objectContaining({})
    )
  })

  it("creates an artifact via POST and surfaces a 409 duplicate error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "An artifact with this name and version already exists." }),
        { status: 409 }
      )
    )

    const { result } = renderHook(() => useCreateArtifact(), { wrapper })

    await expect(
      result.current.mutateAsync({
        type: "tool",
        name: "usdc-payments",
        title: "USDC Payments",
        version: "1.0.0",
      })
    ).rejects.toMatchObject({ status: 409 })
  })

  it("posts a bundle zip with an application/zip content type and returns the parsed manifest", async () => {
    const inspected = {
      manifest: {
        id: "usdc-payments",
        name: "USDC Payments",
        version: "1.0.0",
        description: "Pays things.",
      },
      files: { wasm: "wasm/x.wasm", capabilities: "x.capabilities.json", schemas: [], prompts: [] },
      totalUncompressedBytes: 1234,
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(inspected), { status: 200 }))

    const { result } = renderHook(() => useInspectBundle(), { wrapper })
    const zipBytes = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])])

    const data = await result.current.mutateAsync(zipBytes)

    expect(data).toEqual(inspected)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe("/api/private-artifacts/bundle/inspect")
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/zip" },
    })
  })

  it("round-trips a null capabilities path when the archive carries no *.capabilities.json", async () => {
    // design.md D3/D6: capabilities is now optional -- an inspect response
    // for an archive with none must come back as `null`, not an absent key
    // or an empty string, so the caller can tell "no file" apart from "file
    // named the empty string".
    const inspected = {
      manifest: {
        id: "usdc-payments",
        name: "USDC Payments",
        version: "1.0.0",
        description: "Pays things.",
      },
      files: { wasm: "wasm/x.wasm", capabilities: null, schemas: [], prompts: [] },
      totalUncompressedBytes: 1234,
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(inspected), { status: 200 }))

    const { result } = renderHook(() => useInspectBundle(), { wrapper })
    const zipBytes = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])])

    const data = await result.current.mutateAsync(zipBytes)

    expect(data.files.capabilities).toBeNull()
  })

  it("defensively normalizes a missing checks array from the checks endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ publishable: false }), { status: 200 })
    )

    const { result } = renderHook(() => useArtifactChecks("artifact-1"), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ publishable: false, checks: [] })
  })

  it("surfaces a 409 publish rejection with the server's precondition reason", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "category must be set before publishing" }), {
        status: 409,
      })
    )

    const { result } = renderHook(() => usePublishArtifact("artifact-1"), { wrapper })

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      status: 409,
      message: "category must be set before publishing",
    })
    expect(fetch).toHaveBeenCalledWith(
      "/api/private-artifacts/artifact-1/publish",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("useUploadArtifactBundle takes the target id per-call and PUTs with an explicit zip content type", async () => {
    // The id is passed to mutateAsync rather than bound when the hook is
    // declared — this lets the create flow call it before an artifact id
    // exists yet, and the manage page call it with a stable one, from the
    // same unconditional top-level hook call.
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ content: [{ kind: "wasm", sha256: "a", sizeBytes: 1 }] }), {
        status: 201,
      })
    )

    const { result } = renderHook(() => useUploadArtifactBundle(), { wrapper })
    const zipBytes = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])])

    await result.current.mutateAsync({ id: "artifact-9", bytes: zipBytes })

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe("/api/private-artifacts/artifact-9/bundle")
    expect(init).toMatchObject({
      method: "PUT",
      headers: { "Content-Type": "application/zip" },
    })
  })

  it("useUploadArtifactBundle does not require createdAt on the returned content summaries", async () => {
    // design.md D6's bundle-upload response omits createdAt (the row was
    // just written, not re-fetched) — the type must allow that.
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ content: [{ kind: "wasm", sha256: "a".repeat(64), sizeBytes: 10 }] }),
        { status: 201 }
      )
    )

    const { result } = renderHook(() => useUploadArtifactBundle(), { wrapper })
    const data = await result.current.mutateAsync({
      id: "artifact-9",
      bytes: new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])]),
    })

    expect(data.content).toEqual([{ kind: "wasm", sha256: "a".repeat(64), sizeBytes: 10 }])
  })
})

describe("describeArtifactSaveError", () => {
  it("routes an invalid-category 400 to the category field", () => {
    const described = describeArtifactSaveError(
      new ApiError(400, "Invalid category: Not A Real Category")
    )
    expect(described).toEqual({ field: "category", message: "Invalid category: Not A Real Category" })
  })

  it("routes a sourceUrl validation error to the sourceUrl field", () => {
    const described = describeArtifactSaveError(
      new ApiError(
        400,
        "sourceUrl must be an https URL on github.com, gitlab.com, or bitbucket.org"
      )
    )
    expect(described.field).toBe("sourceUrl")
  })

  it("prefixes a 409 as a duplicate and routes it to no field", () => {
    const described = describeArtifactSaveError(
      new ApiError(409, "An artifact with this name and version already exists.")
    )
    expect(described).toEqual({
      field: null,
      message: "Duplicate: An artifact with this name and version already exists.",
    })
  })

  it("falls back to a generic message for a non-ApiError", () => {
    expect(describeArtifactSaveError(new Error("network down"))).toEqual({
      field: null,
      message: "network down",
    })
    expect(describeArtifactSaveError("not an error")).toEqual({
      field: null,
      message: "Something went wrong.",
    })
  })
})
