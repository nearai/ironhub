import { act, Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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

  it("disables saving, shows an error, and blocks the actual PUT when the stored capabilities.json fails to load (500)", async () => {
    const capabilitiesPutCalls: Array<{ url: string }> = []
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (
        url === "/api/private-artifacts/artifact-1/content/capabilities" &&
        init?.method === "PUT"
      ) {
        capabilitiesPutCalls.push({ url })
        return new Response(JSON.stringify({ content: { kind: "capabilities" } }), {
          status: 201,
        })
      }
      if (url === "/api/private-artifacts/artifact-1/content/capabilities") {
        return new Response(JSON.stringify({ error: "Internal error" }), {
          status: 500,
        })
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText(/could not load the stored capabilities\.json/i)).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    // B3: the guard must live in the submit handler, not just the button's
    // `disabled` prop -- firing a submit directly must not produce a PUT.
    fireEvent.submit(saveButton.closest("form")!)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(capabilitiesPutCalls.length).toBe(0)
  })

  it("treats a 404 (no content row yet) as a safe, savable empty state -- not a load failure", async () => {
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
      expect(
        screen.queryByText(/could not load the stored capabilities\.json/i)
      ).not.toBeInTheDocument()
      expect(screen.getByText(/no capabilities\.json is stored/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled()
    })

    expect(screen.getByPlaceholderText('{ "permissions": [] }')).toHaveValue("")
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
      expect(screen.getByPlaceholderText('{ "permissions": [] }')).toHaveValue(storedCapabilities)
    })
  })

  it("does not re-upload capabilities on a metadata-only save when the draft is unchanged", async () => {
    const storedCapabilities = JSON.stringify({ permissions: ["net"] }, null, 2)
    const capabilitiesPutCalls: Array<{ url: string }> = []

    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1" && init?.method === "PATCH") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (
        url === "/api/private-artifacts/artifact-1/content/capabilities" &&
        init?.method === "PUT"
      ) {
        capabilitiesPutCalls.push({ url })
        return new Response(JSON.stringify({ content: { kind: "capabilities" } }), {
          status: 201,
        })
      }
      if (url === "/api/private-artifacts/artifact-1/content/capabilities") {
        return new Response(storedCapabilities, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled()
    })

    // Change only the title -- leave the capabilities draft exactly as loaded.
    fireEvent.change(screen.getByDisplayValue("My Tool"), {
      target: { value: "My Renamed Tool" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
    })

    expect(capabilitiesPutCalls.length).toBe(0)
  })
})
