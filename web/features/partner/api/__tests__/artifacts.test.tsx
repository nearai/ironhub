import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  useArtifactChecks,
  useArtifacts,
  useCreateArtifact,
  useInspectBundle,
  usePublishArtifact,
} from "../artifacts"

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
})
