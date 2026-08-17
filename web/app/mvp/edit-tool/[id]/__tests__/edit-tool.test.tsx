import { act, Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import EditToolPage from "../page"

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
  sourceUrl: null,
  content: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

// See edit-skill.test.tsx for why render + the initial settle need an
// explicit async act() here: EditToolPage suspends on `use(params)`, and
// testing-library's own act-wrapping doesn't flush that combined with the
// async react-query fetches.
async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Suspense fallback={null}>
            <EditToolPage params={Promise.resolve({ id: "artifact-1" })} />
          </Suspense>
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("edit-tool capabilities content loading", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("disables saving and shows an error when the stored capabilities.json fails to load", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/capabilities") {
        return new Response(JSON.stringify({ error: "Content not found" }), {
          status: 404,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText(/could not load the stored capabilities\.json/i)).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save changes/i })
    expect(saveButton).toBeDisabled()
  })

  it("seeds the capabilities editor and enables saving once the stored document loads", async () => {
    const storedCapabilities = JSON.stringify({ permissions: ["net"] }, null, 2)

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/capabilities") {
        return new Response(storedCapabilities, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled()
    })

    expect(screen.getByPlaceholderText('{ "permissions": [] }')).toHaveValue(storedCapabilities)
  })
})
