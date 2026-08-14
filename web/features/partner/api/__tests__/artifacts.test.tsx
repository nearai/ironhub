import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCreateArtifact, useArtifacts } from "../artifacts"

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
})
