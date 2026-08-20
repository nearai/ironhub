import { act } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import { ToolEditor } from "@/features/partner/components/tool-editor"

const artifact = {
  id: "artifact-1",
  organizationId: "org-1",
  createdById: null,
  type: "tool",
  name: "my-tool",
  title: "My Tool",
  version: "1.0.0",
  visibility: "private",
  status: "draft",
  description: "A tool.",
  category: "Dev Tools",
  sourceUrl: null,
  content: [],
  assets: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

async function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ToolEditor id="artifact-1" />
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return queryClient
}

/** Records every write the editor makes, so "wrote nothing" is assertable. */
function trackWrites() {
  const writes: Array<{ url: string; method: string }> = []
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    if (url === "/api/private-artifacts/artifact-1" && method === "GET") {
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    }
    writes.push({ url, method })
    if (url === "/api/private-artifacts/artifact-1" && method === "PATCH") {
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    }
    if (url.endsWith("/content/wasm") && method === "PUT") {
      return new Response(JSON.stringify({ content: { kind: "wasm" } }), {
        status: 201,
      })
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`)
  })
  return writes
}

describe("edit-tool", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("seeds the form from the artifact record and saves without touching stored files", async () => {
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue("A tool.")).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue("My Tool"), {
      target: { value: "My Renamed Tool" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => expect(writes.length).toBeGreaterThan(0))

    // A metadata edit is a PATCH and nothing else: no stored file is rewritten
    // just because the title changed.
    expect(writes).toEqual([
      { url: "/api/private-artifacts/artifact-1", method: "PATCH" },
    ])
  })

  it("does not ask for a capabilities document, which the manifest now carries", async () => {
    // Regression guard for the removal: *.capabilities.json is the legacy
    // carrier of data reborn.extension_manifest.v3 owns, so the editor must
    // neither read it nor offer to edit it.
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/permissions/i)).not.toBeInTheDocument()
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes("capabilities"))
    ).toBe(false)
    expect(writes).toEqual([])
  })

  it("uploads a replacement program file when one is chosen", async () => {
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File([new Uint8Array([0])], "tool.wasm")] },
    })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => expect(writes.length).toBe(2))
    expect(writes[1]).toEqual({
      url: "/api/private-artifacts/artifact-1/content/wasm",
      method: "PUT",
    })
  })
})
