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

import { TooltipProvider } from "@/components/ui/tooltip"
import { ToastProvider } from "@/features/partner/store/toast-provider"
import ManageSubmissionPage from "../page"

const BASE_ARTIFACT = {
  id: "artifact-1",
  organizationId: "org1",
  createdById: "u1",
  type: "tool" as const,
  name: "firecrawl",
  title: "Firecrawl",
  version: "1.0.0",
  visibility: "private" as const,
  status: "draft" as const,
  category: "Dev Tools",
  description: "Crawl the web.",
  sourceUrl: null,
  // Deliberately the shape of a modern, bundle-ingested tool: wasm +
  // manifest_toml (design.md D3's required kinds for a tool) plus the
  // still-optional capabilities. This keeps BASE_ARTIFACT content-complete
  // under the manage page's local `expectedKinds` gate (mirrors
  // service.ts's REQUIRED_CONTENT_KINDS_BY_TYPE) so it stays a stable
  // "everything is fine" fixture for tests that aren't about completeness.
  // A test that specifically wants an incomplete/pre-bundle-ingest tool
  // (wasm + capabilities, no manifest_toml) builds its own content array.
  content: [
    {
      kind: "wasm" as const,
      sha256: "a".repeat(64),
      sizeBytes: 100,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      kind: "capabilities" as const,
      sha256: "b".repeat(64),
      sizeBytes: 50,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      kind: "manifest_toml" as const,
      sha256: "c".repeat(64),
      sizeBytes: 25,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
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
        <TooltipProvider>
          <ToastProvider>
            <Suspense fallback={<div>Loading route...</div>}>
              <ManageSubmissionPage params={Promise.resolve({ submissionId })} />
            </Suspense>
          </ToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return queryClient
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

    await waitFor(() =>
      expect(screen.getByText("Content complete")).toBeInTheDocument()
    )
    expect(screen.getByText("Category set")).toBeInTheDocument()
    expect(screen.getByText("category is not set.")).toBeInTheDocument()
    expect(screen.getByText("Repository link set")).toBeInTheDocument()
    expect(screen.getByText("sourceUrl is not set.")).toBeInTheDocument()

    // Row count matches the mocked endpoint exactly — a client-side splice
    // (e.g. an extra fabricated pass row) or a dropped row would fail this.
    const rows = document.querySelectorAll("[data-check-id]")
    expect(rows).toHaveLength(3)

    // Each row's rendered status is driven by the server's own status field
    // (via a discriminator no icon-color-only regression can fake past) —
    // pin it can never read "pass" for a check the server reported failing
    // or warning, and vice versa.
    expect(
      document.querySelector('[data-check-id="content_complete"]')
    ).toHaveAttribute("data-check-status", "pass")
    expect(
      document.querySelector('[data-check-id="category_set"]')
    ).toHaveAttribute("data-check-status", "fail")
    expect(
      document.querySelector('[data-check-id="repo_link_set"]')
    ).toHaveAttribute("data-check-status", "warn")

    const failingRow = document.querySelector(
      '[data-check-id="category_set"]'
    ) as HTMLElement
    expect(failingRow.textContent).toContain("Blocked")
    expect(failingRow.textContent).not.toContain("Passed")

    const warningRow = document.querySelector(
      '[data-check-id="repo_link_set"]'
    ) as HTMLElement
    expect(warningRow.textContent).toContain("Warning")

    expect(screen.getByRole("button", { name: /^publish$/i })).toBeDisabled()

    // BASE_ARTIFACT is deliberately content-complete (wasm + manifest_toml)
    // -- pins that the manage page's local completeness gate for "Copy
    // install link" agrees with service.ts's REQUIRED_CONTENT_KINDS_BY_TYPE,
    // independent of whatever the mocked /checks endpoint above reports
    // (that route is unpublishable here purely on category/repo, not
    // content). While the item is a draft, Copy install link lives in the
    // overflow menu rather than the header row (design D6).
    const moreButton = screen.getByRole("button", { name: /more actions/i })
    fireEvent.keyDown(moreButton, { key: "Enter" })
    const copyInstallItem = await screen.findByRole("menuitem", {
      name: /copy install link/i,
    })
    expect(copyInstallItem).not.toHaveAttribute("aria-disabled")
  })

  it("disables Copy install link for a pre-bundle-ingest tool (wasm + capabilities, no manifest_toml)", async () => {
    // design.md D3: this is the exact shape a tool created before bundle
    // ingest existed has -- content_complete now fails for it, and the
    // manage page's local gate must not silently disagree and let an
    // install link be minted for content the server considers incomplete.
    const preBundleIngestTool = {
      ...BASE_ARTIFACT,
      content: BASE_ARTIFACT.content.filter((c) => c.kind !== "manifest_toml"),
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(
          JSON.stringify({
            artifact: { ...preBundleIngestTool, status: "draft" },
          }),
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
                status: "fail",
                detail: "Missing required content: manifest_toml.",
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

    // Copy install link lives in the overflow menu while the item is a
    // draft (design D6).
    const moreButton = await screen.findByRole("button", {
      name: /more actions/i,
    })
    fireEvent.keyDown(moreButton, { key: "Enter" })
    const copyInstallItem = await screen.findByRole("menuitem", {
      name: /copy install link/i,
    })
    expect(copyInstallItem).toHaveAttribute("aria-disabled", "true")
  })

  it("renders a lone failing check's own visible status text, not a fabricated pass indicator", async () => {
    // The `data-check-status` attribute alone can't catch a regression that
    // hardcodes every row's icon/label to "pass" while still copying
    // `check.status` verbatim into the attribute — the attribute and the
    // visible label are set from independent pieces of the render. Asserting
    // on rendered `textContent` (what a user or screen reader actually sees)
    // is what breaks under that mutation; the attribute checks below are a
    // secondary, cheaper cross-check once the text assertion already holds.
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
                id: "wasm_present",
                label: "WASM present",
                status: "fail",
                detail: "wasm content is missing.",
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

    await waitFor(() =>
      expect(
        document.querySelector('[data-check-id="wasm_present"]')
      ).toBeInTheDocument()
    )
    const row = document.querySelector(
      '[data-check-id="wasm_present"]'
    ) as HTMLElement

    expect(row.textContent).toContain("Blocked")
    expect(row.textContent).not.toContain("Passed")
    expect(row).toHaveAttribute("data-check-status", "fail")
    expect(
      document.querySelectorAll('[data-check-status="pass"]')
    ).toHaveLength(0)
  })

  it("gates the checks list and Publish on isError, so a failed refetch cannot leave stale rows or a stale publishable state on screen", async () => {
    let callCount = 0
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(
          JSON.stringify({ artifact: { ...BASE_ARTIFACT, status: "draft" } }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/checks") {
        callCount += 1
        if (callCount === 1) {
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
        return new Response(
          JSON.stringify({ error: "checks service unavailable" }),
          {
            status: 500,
          }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const queryClient = await renderPage()

    const publishButton = await screen.findByRole("button", {
      name: /^publish$/i,
    })
    await waitFor(() => expect(publishButton).not.toBeDisabled())
    expect(
      document.querySelector('[data-check-id="content_complete"]')
    ).toBeInTheDocument()

    // React Query keeps the last-good `data` across a failed refetch, so
    // this forces exactly the scenario the isError gate exists for: a
    // background refetch that 500s while stale pass data is still cached.
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["private-artifacts", "artifact-1", "checks"],
      })
    })

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load review checks/i)
      ).toBeInTheDocument()
    )
    // The stale passing row must not still be on screen next to the error.
    expect(
      document.querySelector('[data-check-id="content_complete"]')
    ).not.toBeInTheDocument()
    // Publish must not still be enabled off stale `publishable: true`.
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
      if (
        url === "/api/private-artifacts/artifact-1/publish" &&
        init?.method === "POST"
      ) {
        status = "published"
        return new Response(
          JSON.stringify({ artifact: { ...BASE_ARTIFACT, status } }),
          {
            status: 200,
          }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    const publishButton = await screen.findByRole("button", {
      name: /^publish$/i,
    })
    await waitFor(() => expect(publishButton).not.toBeDisabled())

    fireEvent.click(publishButton)

    // design D6: once published, Copy install link becomes the primary
    // action and Unpublish moves into the overflow menu.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /copy install link/i })
      ).toBeInTheDocument()
    )
    const moreButton = screen.getByRole("button", { name: /more actions/i })
    fireEvent.keyDown(moreButton, { key: "Enter" })
    expect(
      await screen.findByRole("menuitem", { name: /^unpublish$/i })
    ).toBeInTheDocument()
  })

  it("reaches delete from the overflow menu and still requires confirmation before removing anything (design D6)", async () => {
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
          JSON.stringify({ checks: [], publishable: false }),
          { status: 200 }
        )
      }
      if (
        url === "/api/private-artifacts/artifact-1" &&
        init?.method === "DELETE"
      ) {
        return new Response(null, { status: 204 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    const moreButton = await screen.findByRole("button", {
      name: /more actions/i,
    })
    fireEvent.keyDown(moreButton, { key: "Enter" })

    // Download is offered alongside Delete for a draft with stored content.
    // BASE_ARTIFACT has no bundle_zip, so the primary download kind is the
    // wasm program file -- "Download program", not "Download package".
    expect(
      await screen.findByRole("menuitem", { name: /download program/i })
    ).toBeInTheDocument()

    const deleteItem = screen.getByRole("menuitem", { name: /delete item/i })
    fireEvent.click(deleteItem)

    // Selecting Delete opens the confirmation dialog rather than deleting
    // immediately -- the trigger moved, but the confirmation step did not.
    const confirmHeading = await screen.findByRole("heading", {
      name: /delete firecrawl\?/i,
    })
    expect(confirmHeading).toBeInTheDocument()
    expect(
      vi.mocked(fetch).mock.calls.some(
        ([reqInput, reqInit]) =>
          String(reqInput) === "/api/private-artifacts/artifact-1" &&
          (reqInit as RequestInit | undefined)?.method === "DELETE"
      )
    ).toBe(false)

    const confirmButton = screen.getByRole("button", { name: /^delete item$/i })
    fireEvent.click(confirmButton)

    await waitFor(() =>
      expect(
        vi.mocked(fetch).mock.calls.some(
          ([reqInput, reqInit]) =>
            String(reqInput) === "/api/private-artifacts/artifact-1" &&
            (reqInit as RequestInit | undefined)?.method === "DELETE"
        )
      ).toBe(true)
    )
  })

  it("shows what the item is, and leaves a tool's files to its Package step", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact: BASE_ARTIFACT }), {
          status: 200,
        })
      }
      if (url === "/api/private-artifacts/artifact-1/checks") {
        return new Response(JSON.stringify({ checks: [], publishable: false }), {
          status: 200,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    await waitFor(() => expect(screen.getByText("Tool")).toBeInTheDocument())
    // The generic Files section listed a tool's stored files as three
    // separately managed things when they all come out of one archive; the
    // tool editor's Package step owns that now.
    expect(screen.queryByText("Files")).not.toBeInTheDocument()
    expect(
      screen.queryByText(/what's stored for this item right now/i)
    ).not.toBeInTheDocument()
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
      if (
        url === "/api/private-artifacts/artifact-1/publish" &&
        init?.method === "POST"
      ) {
        return new Response(
          JSON.stringify({ error: "category must be set before publishing" }),
          { status: 409 }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    const publishButton = await screen.findByRole("button", {
      name: /^publish$/i,
    })
    await waitFor(() => expect(publishButton).not.toBeDisabled())

    fireEvent.click(publishButton)

    await waitFor(() =>
      expect(
        screen.getByText("category must be set before publishing")
      ).toBeInTheDocument()
    )
    // Status is unchanged — still offering "Publish", not "Unpublish".
    expect(
      screen.getByRole("button", { name: /^publish$/i })
    ).toBeInTheDocument()
  })
})
