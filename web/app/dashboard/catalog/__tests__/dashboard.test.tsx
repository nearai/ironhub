import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const replaceMock = vi.fn()
let searchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => "/dashboard/catalog",
  // The type selection lives in the URL, so the mock has to be a real
  // `URLSearchParams` a test can set before rendering.
  useSearchParams: () => searchParams,
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import CatalogPage from "../page"

const MOCK_ARTIFACTS = [
  {
    id: "art-1",
    organizationId: "org-1",
    createdById: "u1",
    type: "skill" as const,
    name: "invoice-summariser",
    title: "Invoice Summariser",
    version: "1.4.0",
    visibility: "private" as const,
    status: "draft" as const,
    category: "Productivity",
    description: "Summarises incoming invoices.",
    sourceUrl: null,
    content: [],
    createdAt: "2026-08-17T18:55:22.000Z",
    updatedAt: "2026-08-17T18:55:22.000Z",
  },
  {
    id: "art-2",
    organizationId: "org-1",
    createdById: "u1",
    type: "tool" as const,
    name: "wallet-activity-watcher",
    title: "Wallet Activity Watcher",
    version: "0.3.0",
    visibility: "public" as const,
    status: "draft" as const,
    category: "Web3",
    description: "Watches wallet actions.",
    sourceUrl: "https://github.com/example/wallet",
    content: [
      {
        kind: "wasm" as const,
        sha256: "a".repeat(64),
        sizeBytes: 1024,
        createdAt: "2026-08-17T14:59:25.000Z",
      },
      {
        kind: "manifest_toml" as const,
        sha256: "b".repeat(64),
        sizeBytes: 512,
        createdAt: "2026-08-17T14:59:25.000Z",
      },
    ],
    createdAt: "2026-08-17T14:59:25.000Z",
    updatedAt: "2026-08-17T14:59:25.000Z",
  },
  {
    id: "art-3",
    organizationId: "org-1",
    createdById: "u1",
    type: "tool" as const,
    name: "web-scrape-runner",
    title: "Web Scrape Runner",
    version: "2.3.0",
    visibility: "private" as const,
    status: "published" as const,
    category: "Data & APIs",
    description: "Runs web scrape tasks.",
    sourceUrl: null,
    content: [
      {
        kind: "wasm" as const,
        sha256: "c".repeat(64),
        sizeBytes: 2048,
        createdAt: "2026-08-17T13:59:25.000Z",
      },
    ],
    createdAt: "2026-08-17T13:59:25.000Z",
    updatedAt: "2026-08-17T13:59:25.000Z",
  },
  {
    id: "art-4",
    organizationId: "org-1",
    createdById: "u1",
    type: "skill" as const,
    name: "onboarding-buddy",
    title: "Onboarding Buddy",
    version: "0.4.0",
    visibility: "private" as const,
    status: "draft" as const,
    category: null,
    description: null,
    sourceUrl: null,
    content: [],
    createdAt: "2026-07-27T10:59:25.000Z",
    updatedAt: "2026-07-27T10:59:25.000Z",
  },
]

const MOCK_SOUL = {
  id: "art-5",
  organizationId: "org-1",
  createdById: "u1",
  type: "soul" as const,
  name: "careful-analyst",
  title: "Careful Analyst",
  version: "1.0.0",
  visibility: "private" as const,
  status: "draft" as const,
  category: "Productivity",
  description: "A cautious, citation-first persona.",
  sourceUrl: null,
  content: [],
  createdAt: "2026-08-18T10:00:00.000Z",
  updatedAt: "2026-08-18T10:00:00.000Z",
}

/** Widened past the fixture array's own element type so a test can add a
 *  soul to it -- the array literal alone infers only the types it contains. */
type MockArtifact = (typeof MOCK_ARTIFACTS)[number] | typeof MOCK_SOUL

async function renderDashboard(artifacts: MockArtifact[] = MOCK_ARTIFACTS) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input)
    if (url === "/api/private-artifacts") {
      return new Response(JSON.stringify({ artifacts }), { status: 200 })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CatalogPage />
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  return queryClient
}

describe("dashboard page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
    searchParams = new URLSearchParams()
    replaceMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it("lists a row for every fetched artifact in table view and renders Uncategorised for null category", async () => {
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )
    expect(screen.getByText("Wallet Activity Watcher")).toBeInTheDocument()
    expect(screen.getByText("Web Scrape Runner")).toBeInTheDocument()
    expect(screen.getByText("Onboarding Buddy")).toBeInTheDocument()

    const tbody = document.querySelector("tbody")
    expect(tbody).not.toBeNull()
    const rows = document.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(4)

    // Verify null category artifact renders Uncategorised in the table row
    expect(within(tbody!).getByText("Uncategorised")).toBeInTheDocument()
  })

  it("renders the identifier under the title rather than as a heading", async () => {
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )

    const identifierEl = screen.getByText("invoice-summariser")
    const titleEl = screen.getByText("Invoice Summariser")

    expect(identifierEl).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "invoice-summariser" })
    ).toBeNull()
    expect(identifierEl).not.toBe(titleEl)
  })

  it("preserves the filtered set when switching between table and card views", async () => {
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )

    // Select status filter "Drafts" via KPI card
    const draftsCard = screen.getByRole("button", { name: /drafts/i })
    fireEvent.click(draftsCard)

    // Verify filtered items in table view
    expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    expect(screen.getByText("Wallet Activity Watcher")).toBeInTheDocument()
    expect(screen.getByText("Onboarding Buddy")).toBeInTheDocument()
    expect(screen.queryByText("Web Scrape Runner")).not.toBeInTheDocument()

    // Switch to cards view
    const cardsToggle = screen.getByRole("button", { name: /^cards$/i })
    fireEvent.click(cardsToggle)

    // Exactly the same items should be present, and excluded ones should not
    expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    expect(screen.getByText("Wallet Activity Watcher")).toBeInTheDocument()
    expect(screen.getByText("Onboarding Buddy")).toBeInTheDocument()
    expect(screen.queryByText("Web Scrape Runner")).not.toBeInTheDocument()
  })

  it("renders distinguishable, mutually exclusive empty states for zero items vs filter mismatch", async () => {
    // 1. Zero items fetched
    await renderDashboard([])

    await waitFor(() =>
      expect(screen.getByText("Nothing in your catalog yet")).toBeInTheDocument()
    )
    expect(
      screen.getByText(
        "Add your first skill, tool or soul to share it with your organization."
      )
    ).toBeInTheDocument()
    // Both header and empty state have "Add skill or tool" links
    const addLinks = screen.getAllByRole("link", { name: /add an item/i })
    expect(addLinks).toHaveLength(2)
    for (const link of addLinks) {
      expect(link).toHaveAttribute("href", "/dashboard/new-submit")
    }
    expect(
      screen.queryByText("Nothing matches these filters")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /clear filters/i })
    ).not.toBeInTheDocument()
  })

  it("renders filter mismatch empty state with clear filters button", async () => {
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )

    const searchInput = screen.getByLabelText("Search your catalog")
    fireEvent.change(searchInput, { target: { value: "nonexistent-item-xyz" } })

    expect(
      screen.getByText("Nothing matches these filters")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Try a different search term, or clear the filters to see everything again."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Nothing in your catalog yet")
    ).not.toBeInTheDocument()
    // Only 1 "Add skill or tool" link (in header) exists, empty state has none
    expect(
      screen.getAllByRole("link", { name: /add an item/i })
    ).toHaveLength(1)

    // Clicking Clear filters resets and restores items
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }))
    expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    expect(screen.getByText("Web Scrape Runner")).toBeInTheDocument()
  })

  it("writes 'cards' to sessionStorage when selecting card view", async () => {
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )

    const cardsToggle = screen.getByRole("button", { name: /^cards$/i })
    fireEvent.click(cardsToggle)

    expect(sessionStorage.getItem("ironhub.workspace.catalogView")).toBe(
      "cards"
    )
  })

  it("yields the card view on mount when sessionStorage is pre-seeded with 'cards'", async () => {
    sessionStorage.setItem("ironhub.workspace.catalogView", "cards")
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )

    // Table view renders a <tbody>, card view does not
    expect(document.querySelector("tbody")).toBeNull()
    // Card view renders file count badges and descriptions
    expect(screen.getAllByText("No files")).toHaveLength(2)
    expect(screen.getByText("1 file")).toBeInTheDocument()
    expect(screen.getByText("2 files")).toBeInTheDocument()
    expect(
      screen.getByText("Summarises incoming invoices.")
    ).toBeInTheDocument()
  })

  it("updates aria-pressed on the view toggle buttons when changing views", async () => {
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )

    const tableToggle = screen.getByRole("button", { name: /^table$/i })
    const cardsToggle = screen.getByRole("button", { name: /^cards$/i })

    expect(tableToggle).toHaveAttribute("aria-pressed", "true")
    expect(cardsToggle).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(cardsToggle)

    expect(tableToggle).toHaveAttribute("aria-pressed", "false")
    expect(cardsToggle).toHaveAttribute("aria-pressed", "true")
  })
})

describe("catalog type filtering", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
    searchParams = new URLSearchParams()
    replaceMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it("lists only artifacts of the type named in the URL", async () => {
    searchParams = new URLSearchParams("type=soul")
    await renderDashboard([...MOCK_ARTIFACTS, MOCK_SOUL])

    await waitFor(() =>
      expect(screen.getByText("Careful Analyst")).toBeInTheDocument()
    )
    expect(screen.queryByText("Invoice Summariser")).not.toBeInTheDocument()
    expect(screen.queryByText("Wallet Activity Watcher")).not.toBeInTheDocument()
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1)
  })

  it("lists every type when no type is named", async () => {
    await renderDashboard([...MOCK_ARTIFACTS, MOCK_SOUL])

    await waitFor(() =>
      expect(screen.getByText("Careful Analyst")).toBeInTheDocument()
    )
    expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    expect(document.querySelectorAll("tbody tr")).toHaveLength(5)
  })

  it("reflects a type selection in the URL rather than in local state", async () => {
    await renderDashboard([...MOCK_ARTIFACTS, MOCK_SOUL])

    await waitFor(() =>
      expect(screen.getByText("Careful Analyst")).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole("button", { name: /1\s*Souls/ }))

    // The selection is a URL write, which is what makes it survive a reload
    // and what the navigation's sub-items read to mark themselves active.
    expect(replaceMock).toHaveBeenCalledWith("/dashboard/catalog?type=soul", {
      scroll: false,
    })
  })

  it("applies the type selection together with the search box", async () => {
    searchParams = new URLSearchParams("type=skill")
    await renderDashboard([...MOCK_ARTIFACTS, MOCK_SOUL])

    await waitFor(() =>
      expect(screen.getByText("Invoice Summariser")).toBeInTheDocument()
    )
    fireEvent.change(screen.getByLabelText("Search your catalog"), {
      target: { value: "onboarding" },
    })

    expect(screen.getByText("Onboarding Buddy")).toBeInTheDocument()
    expect(screen.queryByText("Invoice Summariser")).not.toBeInTheDocument()
    expect(screen.queryByText("Careful Analyst")).not.toBeInTheDocument()
  })

  it("names the type and offers to create one when the type is empty", async () => {
    searchParams = new URLSearchParams("type=soul")
    await renderDashboard(MOCK_ARTIFACTS)

    await waitFor(() =>
      expect(screen.getByText("No souls yet")).toBeInTheDocument()
    )
    // Distinct from the filter-mismatch state: clearing filters would not
    // produce a soul, so that is not the offer made here.
    expect(
      screen.queryByText("Nothing matches these filters")
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /add a soul/i })
    ).toHaveAttribute("href", "/dashboard/new-submit?type=soul")
  })

  it("treats an unrecognised type in the URL as no selection", async () => {
    // Not merely a type the workspace has yet to support -- one it never
    // will -- so this stays a test about unrecognised input.
    searchParams = new URLSearchParams("type=widget")
    await renderDashboard([...MOCK_ARTIFACTS, MOCK_SOUL])

    await waitFor(() =>
      expect(screen.getByText("Careful Analyst")).toBeInTheDocument()
    )
    expect(document.querySelectorAll("tbody tr")).toHaveLength(5)
  })
})
