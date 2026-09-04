import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { LoadoutMemberPicker } from "@/features/partner/components/loadout-member-picker"
import type { ResolvedMember } from "@/features/partner/api/loadouts"

const ARTIFACTS = [
  {
    id: "a-draft",
    organizationId: "org-1",
    createdById: "u1",
    type: "skill",
    name: "chart-reading",
    title: "Chart Reading",
    version: "0.9.0",
    visibility: "private",
    status: "draft",
    publishedVersion: null,
    category: "Finance",
    description: "Reads candlestick charts.",
    sourceUrl: null,
    content: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "a-soul",
    organizationId: "org-1",
    createdById: "u1",
    type: "soul",
    name: "steady-hand",
    title: "Steady Hand",
    version: "1.0.0",
    visibility: "private",
    status: "published",
    publishedVersion: "1.0.0",
    category: "Finance",
    description: "A calm persona.",
    sourceUrl: null,
    content: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "loadout-1",
    organizationId: "org-1",
    createdById: "u1",
    type: "loadout",
    name: "trading-desk",
    title: "Trading Desk",
    version: "1.0.0",
    visibility: "private",
    status: "draft",
    publishedVersion: null,
    category: "Finance",
    description: "This loadout.",
    sourceUrl: null,
    content: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
]

const PUBLIC_ENTRIES = [
  {
    slug: "market-data",
    kind: "tool" as const,
    title: "Market Data",
    version: "2.3.1",
    description: "Quotes and candles.",
    category: "Finance",
  },
  {
    slug: "risk-check",
    kind: "skill" as const,
    title: "Risk Check",
    version: "1.2.0",
    description: "Position sizing rules.",
    category: "Finance",
  },
]

const COLLECTION = {
  slug: "trading-stack",
  title: "Trading Stack",
  summary: "Everything a desk needs.",
  items: PUBLIC_ENTRIES,
}

let posted: unknown[] = []
let deleted: string[] = []

function stubFetch() {
  posted = []
  deleted = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        })

      if (url === "/api/private-artifacts") return json({ artifacts: ARTIFACTS })
      if (url === "/api/catalog/entries") {
        return json({ entries: PUBLIC_ENTRIES, collections: [COLLECTION] })
      }
      if (url === "/api/private-artifacts/loadout-1/items") {
        posted.push(JSON.parse(String(init?.body)))
        return json({ item: {} }, 201)
      }
      if (url.startsWith("/api/private-artifacts/loadout-1/items/")) {
        deleted.push(url.split("/").pop() as string)
        return new Response(null, { status: 204 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
  )
}

async function renderPicker(
  members: ResolvedMember[] = [],
  initialTab: "all" | "skill" | "tool" | "soul" | "collection" = "all"
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LoadoutMemberPicker
          loadoutId="loadout-1"
          open
          onOpenChange={() => {}}
          members={members}
          initialTab={initialTab}
        />
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await waitFor(() =>
    expect(
      screen.queryByText(/loading what you can add/i)
    ).not.toBeInTheDocument()
  )
  return queryClient
}

function resolved(overrides: Partial<ResolvedMember>): ResolvedMember {
  return {
    memberId: "m-1",
    source: "private",
    kind: "tool",
    name: "unnamed",
    pinnedVersion: null,
    pinnedDigest: null,
    currentVersion: null,
    currentDigest: null,
    status: "ok",
    reason: null,
    blocksInstall: false,
    blocksPublish: false,
    href: null,
    ...overrides,
  }
}

beforeEach(stubFetch)
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("loadout member picker — candidate status", () => {
  it("shows a draft candidate as a draft while composing, not at publish", async () => {
    await renderPicker()

    const card = screen.getByTestId("candidate-private:skill:chart-reading")
    expect(card).toHaveTextContent("Draft")
    expect(card).toHaveTextContent(
      /cannot be published while it stays one/i
    )
  })

  it("shows each candidate's type and where it comes from", async () => {
    await renderPicker()

    expect(
      screen.getByTestId("candidate-private:skill:chart-reading")
    ).toHaveTextContent("Your space")
    expect(
      screen.getByTestId("candidate-public:tool:market-data")
    ).toHaveTextContent(/public · verified/i)
    expect(
      screen.getByTestId("candidate-public:tool:market-data")
    ).toHaveTextContent("Tool")
  })

  it("never offers the loadout being edited, or any other loadout, as a member", async () => {
    await renderPicker()

    expect(
      screen.queryByTestId("candidate-private:loadout:trading-desk")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /add trading desk/i })
    ).not.toBeInTheDocument()
  })
})

describe("loadout member picker — adding and removing", () => {
  it("adds a private member by its artifact id and a public one by its name", async () => {
    await renderPicker()

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /add chart reading/i })
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /add market data/i }))
    })

    expect(posted).toEqual([
      {
        source: "private",
        kind: "skill",
        name: "chart-reading",
        artifactId: "a-draft",
      },
      { source: "public", kind: "tool", name: "market-data" },
    ])
  })

  it("reads an already-added candidate as added, and removes it by member id", async () => {
    await renderPicker([
      resolved({
        memberId: "m-42",
        source: "public",
        kind: "tool",
        name: "market-data",
      }),
    ])

    const button = screen.getByRole("button", { name: /added market data/i })
    await act(async () => {
      fireEvent.click(button)
    })

    expect(deleted).toEqual(["m-42"])
    expect(posted).toEqual([])
  })

  it("refuses a second soul locally, naming the one already in the loadout", async () => {
    await renderPicker([
      resolved({
        memberId: "m-7",
        source: "private",
        kind: "soul",
        name: "careful-analyst",
      }),
    ])

    const card = screen.getByTestId("candidate-private:soul:steady-hand")
    expect(card).toHaveTextContent(/already has the soul "careful-analyst"/i)
    expect(
      screen.getByRole("button", { name: /add steady hand/i })
    ).toBeDisabled()
  })
})

describe("loadout member picker — opening on a kind", () => {
  it("opens on the tab the caller asked for, without hiding the others", async () => {
    await renderPicker([], "tool")

    // Pre-filtered to tools: the editor's Tools card asked for tools.
    expect(
      screen.getByTestId("candidate-public:tool:market-data")
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId("candidate-private:skill:chart-reading")
    ).not.toBeInTheDocument()

    // The reader is not trapped there.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Skills" }))
    })
    expect(
      screen.getByTestId("candidate-private:skill:chart-reading")
    ).toBeInTheDocument()
  })

  it("opens on Collections when asked, offering no candidate rows there", async () => {
    await renderPicker([], "collection")

    expect(
      screen.getByRole("button", { name: /add 2 items/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId("candidate-public:tool:market-data")
    ).not.toBeInTheDocument()
  })
})

describe("loadout member picker — collections", () => {
  it("expands a collection into its individual members and never records the collection", async () => {
    await renderPicker()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /add 2 items/i }))
    })

    expect(posted).toEqual([
      { source: "public", kind: "tool", name: "market-data" },
      { source: "public", kind: "skill", name: "risk-check" },
    ])
    // A collection is derived from a keyword query at request time, so there
    // is nothing stable to pin. It is never a member.
    expect(
      posted.some(
        (body) => (body as { kind?: string }).kind === "collection"
      )
    ).toBe(false)
  })

  it("deduplicates against what is already in the loadout, and says how many were skipped", async () => {
    await renderPicker([
      resolved({
        memberId: "m-9",
        source: "public",
        kind: "tool",
        name: "market-data",
      }),
    ])

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /add 2 items/i }))
    })

    expect(posted).toEqual([
      { source: "public", kind: "skill", name: "risk-check" },
    ])
    expect(
      screen.getByText(/1 was already in this loadout/i)
    ).toBeInTheDocument()
  })

  it("says a collection is added as its items rather than as itself", async () => {
    await renderPicker()

    expect(
      screen.getByText(/a collection is a saved search, not a fixed set/i)
    ).toBeInTheDocument()
  })
})
