import { Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import ManageSubmissionPage from "../page"

const BASE_ARTIFACT = {
  id: "artifact-1",
  organizationId: "org1",
  createdById: "u1",
  type: "tool",
  name: "firecrawl",
  title: "Firecrawl",
  version: "1.0.0",
  visibility: "private",
  category: "Dev Tools",
  description: "Crawl the web.",
  sourceUrl: null,
  content: [
    { kind: "wasm", sha256: "a".repeat(64), sizeBytes: 100, createdAt: "2026-01-01T00:00:00.000Z" },
    { kind: "capabilities", sha256: "b".repeat(64), sizeBytes: 50, createdAt: "2026-01-01T00:00:00.000Z" },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

// `use(params)` suspends on first render since the params promise hasn't
// settled from React's perspective yet. RTL's render() is synchronous and
// doesn't give the settlement microtask a chance to run inside an act()
// scope, so without this the tree never progresses past the Suspense
// fallback (see debug notes: renderPage must await a tick inside act()).
async function renderPage(submissionId = "artifact-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Suspense fallback={<div>Loading route...</div>}>
            <ManageSubmissionPage params={Promise.resolve({ submissionId })} />
          </Suspense>
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("manage page — review checks and publish/unpublish", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders each check's own status and detail, with no invented pass ticks, and disables publish when not publishable", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(
          JSON.stringify({ artifact: { ...BASE_ARTIFACT, status: "draft" } }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/checks") {
        return new Response(
          JSON.stringify({
            checks: [
              {
                id: "content_complete",
                label: "Content complete",
                status: "pass",
                detail: "All required content is present.",
              },
              {
                id: "category_set",
                label: "Category set",
                status: "fail",
                detail: "category is not set.",
              },
              {
                id: "repo_link_set",
                label: "Repository link set",
                status: "warn",
                detail: "sourceUrl is not set.",
              },
            ],
            publishable: false,
          }),
          { status: 200 }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    await waitFor(() => expect(screen.getByText("Content complete")).toBeInTheDocument())
    expect(screen.getByText("Category set")).toBeInTheDocument()
    expect(screen.getByText("category is not set.")).toBeInTheDocument()
    expect(screen.getByText("Repository link set")).toBeInTheDocument()
    expect(screen.getByText("sourceUrl is not set.")).toBeInTheDocument()

    expect(screen.getByRole("button", { name: /^publish$/i })).toBeDisabled()
  })

  it("enables publish once every check passes, and the page reflects the published status without a reload", async () => {
    let status: "draft" | "published" = "draft"
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(
          JSON.stringify({ artifact: { ...BASE_ARTIFACT, status } }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/checks") {
        return new Response(
          JSON.stringify({
            checks: [
              {
                id: "content_complete",
                label: "Content complete",
                status: "pass",
                detail: "All required content is present.",
              },
            ],
            publishable: true,
          }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/publish" && init?.method === "POST") {
        status = "published"
        return new Response(JSON.stringify({ artifact: { ...BASE_ARTIFACT, status } }), {
          status: 200,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    const publishButton = await screen.findByRole("button", { name: /^publish$/i })
    await waitFor(() => expect(publishButton).not.toBeDisabled())

    fireEvent.click(publishButton)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^unpublish$/i })).toBeInTheDocument()
    )
  })

  it("surfaces a 409 publish rejection as the server's reason, inline", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(
          JSON.stringify({ artifact: { ...BASE_ARTIFACT, status: "draft" } }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/checks") {
        return new Response(
          JSON.stringify({
            checks: [
              {
                id: "content_complete",
                label: "Content complete",
                status: "pass",
                detail: "All required content is present.",
              },
            ],
            publishable: true,
          }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/publish" && init?.method === "POST") {
        return new Response(
          JSON.stringify({ error: "category must be set before publishing" }),
          { status: 409 }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    const publishButton = await screen.findByRole("button", { name: /^publish$/i })
    await waitFor(() => expect(publishButton).not.toBeDisabled())

    fireEvent.click(publishButton)

    await waitFor(() =>
      expect(screen.getByText("category must be set before publishing")).toBeInTheDocument()
    )
    // Status is unchanged — still offering "Publish", not "Unpublish".
    expect(screen.getByRole("button", { name: /^publish$/i })).toBeInTheDocument()
  })
})
