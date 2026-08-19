import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useMintInstallToken } from "../artifacts"

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useMintInstallToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("mints an install token and returns a manifest URL to copy", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: "tok_abc",
          manifestUrl:
            "https://example.com/api/private-artifacts/manifest/tok_abc",
        }),
        { status: 200 }
      )
    )

    const { result } = renderHook(() => useMintInstallToken("artifact1"), {
      wrapper,
    })

    const { manifestUrl } = await result.current.mutateAsync()

    expect(fetch).toHaveBeenCalledWith(
      "/api/private-artifacts/artifact1/token",
      expect.objectContaining({ method: "POST" })
    )
    expect(manifestUrl).toBe(
      "https://example.com/api/private-artifacts/manifest/tok_abc"
    )
  })
})
