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
  return queryClient
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
        return new Response(
          JSON.stringify({ content: { kind: "capabilities" } }),
          {
            status: 201,
          }
        )
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
      expect(
        screen.getByText(/stored permissions could not be loaded/i)
      ).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    // B3: the guard must live in the submit handler, not just the button's
    // `disabled` prop -- firing a submit directly must not produce a PUT.
    // The draft is seeded to valid JSON first (bypassing the textarea's
    // `disabled` via fireEvent, which jsdom does not enforce) so this
    // isolates the `capabilitiesReady` guard from the separate JSON.parse
    // validity check -- an empty, never-seeded draft would fail that check
    // regardless of the guard, which would make this assertion pass for
    // the wrong reason.
    fireEvent.change(screen.getByPlaceholderText('{ "permissions": [] }'), {
      target: { value: "{}" },
    })
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
        screen.queryByText(/stored permissions could not be loaded/i)
      ).not.toBeInTheDocument()
      expect(
        screen.getByText(/no permissions file is stored for this tool/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
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
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByPlaceholderText('{ "permissions": [] }')).toHaveValue(
        storedCapabilities
      )
    })
  })

  it("does not re-upload capabilities on a metadata-only save when the draft is unchanged", async () => {
    const storedCapabilities = JSON.stringify({ permissions: ["net"] }, null, 2)
    const capabilitiesPutCalls: Array<{ url: string }> = []

    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (
        url === "/api/private-artifacts/artifact-1" &&
        init?.method === "PATCH"
      ) {
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
        return new Response(
          JSON.stringify({ content: { kind: "capabilities" } }),
          {
            status: 201,
          }
        )
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

    // `capabilitiesReady` (which enables the button) and `capabilitiesDraft`
    // (seeded by a separate useEffect, one render later) can be observed in
    // different commits: the button can already be enabled on the render
    // where `capabilitiesText` first resolves, before the effect that
    // copies it into `capabilitiesDraft` has run. Waiting only for the
    // button lets a submit race ahead of seeding, land with an empty draft,
    // and upload it as if it were a real (spurious) change -- wait for the
    // textarea to actually hold the loaded value too, exactly as the
    // "seeds the capabilities editor" test above does, or this test can
    // pass/fail on timing rather than on the skip-when-unchanged logic.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByPlaceholderText('{ "permissions": [] }')).toHaveValue(
        storedCapabilities
      )
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

  // N6 regression: a background refetch failing *after* an initial success
  // must not block saving, disable the textarea, or clear the draft -- the
  // user still has real, safe content loaded to save on top of.
  it("does not block saving or disable the editor when a background refetch fails after an initial success", async () => {
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

    const queryClient = await renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByPlaceholderText('{ "permissions": [] }')).toHaveValue(
        storedCapabilities
      )
    })

    // Now make the content route fail, and force a refetch (standing in
    // for the real trigger -- refetchOnWindowFocus after staleTime elapses).
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/capabilities") {
        return new Response(JSON.stringify({ error: "Internal error" }), {
          status: 500,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await act(async () => {
      queryClient.refetchQueries({
        queryKey: ["private-artifact-content", "artifact-1", "capabilities"],
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await waitFor(() => {
      expect(
        screen.getByText(/could not refresh the stored permissions/i)
      ).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('{ "permissions": [] }')
    expect(
      screen.queryByText(/stored permissions could not be loaded/i)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).not.toBeDisabled()
    expect(textarea).not.toBeDisabled()
    expect(textarea).toHaveValue(storedCapabilities)
  })
})
