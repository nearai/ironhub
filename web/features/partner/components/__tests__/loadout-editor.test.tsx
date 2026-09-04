import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import { LoadoutEditor } from "@/features/partner/components/loadout-editor"

const LOADOUT = {
  id: "loadout-1",
  organizationId: "org-1",
  createdById: "u1",
  type: "loadout" as const,
  name: "trading-desk",
  title: "Trading Desk",
  version: "1.0.0",
  visibility: "private" as const,
  status: "published" as const,
  publishedVersion: "1.0.0",
  category: "Finance",
  description: "A trader and the tools it needs.",
  sourceUrl: null,
  content: [],
  assets: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

const SOUL_TEXT = "# Who you are\n\nYou are a careful analyst."

/** A resolved item with every health field, so a test only states what it is
 *  about. */
function item(overrides: Record<string, unknown>) {
  return {
    memberId: "m-0",
    source: "private",
    kind: "tool",
    name: "unnamed",
    pinnedVersion: "1.0.0",
    pinnedDigest: "d".repeat(64),
    currentVersion: "1.0.0",
    currentDigest: "d".repeat(64),
    status: "ok",
    reason: null,
    blocksInstall: false,
    blocksPublish: false,
    href: null,
    ...overrides,
  }
}

let publishCalls = 0

function stubFetch(
  items: ReturnType<typeof item>[],
  options: { publishable?: boolean } = {}
) {
  publishCalls = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        })

      if (url === "/api/private-artifacts/loadout-1/items") {
        if (init?.method === "POST") return json({ item: item({}) }, 201)
        return json({ items })
      }
      if (url === "/api/private-artifacts/loadout-1/checks") {
        return json({ checks: [], publishable: options.publishable ?? true })
      }
      if (url === "/api/private-artifacts/loadout-1/publish") {
        publishCalls += 1
        return json({ artifact: LOADOUT })
      }
      if (url === "/api/private-artifacts/loadout-1") {
        return json({ artifact: LOADOUT })
      }
      if (url === "/api/private-artifacts") return json({ artifacts: [LOADOUT] })
      if (url === "/api/private-artifacts/soul-1/content/soul_md") {
        return new Response(SOUL_TEXT, { status: 200 })
      }
      if (url === "/api/catalog/entries") {
        return json({ entries: [], collections: [] })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
  )
}

async function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <LoadoutEditor id="loadout-1" />
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await waitFor(() =>
    expect(screen.queryByText(/loading this loadout/i)).not.toBeInTheDocument()
  )
  return queryClient
}

/** The section headings, in render order. */
function sectionHeadings() {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent?.trim())
}

const THREE_ITEMS = [
  item({
    memberId: "m-soul",
    source: "private",
    kind: "soul",
    name: "careful-analyst",
    href: "/dashboard/manage/soul-1",
  }),
  item({
    memberId: "m-skill",
    source: "private",
    kind: "skill",
    name: "chart-reading",
    currentVersion: "1.4.0",
    href: "/dashboard/manage/skill-9",
  }),
  item({
    memberId: "m-tool",
    source: "public",
    kind: "tool",
    name: "near-rpc",
    currentVersion: "2.3.1",
    href: "/marketplace/near-rpc",
  }),
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("loadout editor — layout", () => {
  beforeEach(() => stubFetch(THREE_ITEMS))

  it("gives each kind its own section rather than one flat list", async () => {
    await renderEditor()

    const headings = sectionHeadings()
    expect(headings).toContain("Soul")
    expect(headings).toContain("Skills")
    expect(headings).toContain("Tools")
    expect(headings).not.toContain("Members")
    expect(headings).not.toContain("Items")
  })

  it("sorts each item into its own kind's section", async () => {
    await renderEditor()

    const sectionFor = (name: string) =>
      screen
        .getByRole("heading", { level: 2, name })
        .closest("section") as HTMLElement

    expect(sectionFor("Soul")).toHaveTextContent("careful-analyst")
    expect(sectionFor("Soul")).not.toHaveTextContent("near-rpc")
    expect(sectionFor("Skills")).toHaveTextContent("chart-reading")
    expect(sectionFor("Tools")).toHaveTextContent("near-rpc")
    expect(sectionFor("Tools")).not.toHaveTextContent("chart-reading")
  })

  it("numbers nothing — composing a loadout is not a sequence", async () => {
    await renderEditor()

    for (const heading of sectionHeadings()) {
      expect(heading).not.toMatch(/^Step \d+:/)
    }
  })

  it("offers no re-pin action — publishing is what re-pins", async () => {
    await renderEditor()

    expect(
      screen.queryByRole("button", { name: /re-pin/i })
    ).not.toBeInTheDocument()
    expect(sectionHeadings()).not.toContain("Re-pin and republish")
  })

  it("holds no collection section, only an action that expands one", async () => {
    await renderEditor()

    expect(sectionHeadings()).not.toContain("Collections")
    expect(
      screen.getByRole("button", { name: /add from a collection/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/a collection is a saved search, not a fixed set/i)
    ).toBeInTheDocument()
  })

  it("asks for no repository link, since a loadout has no repository", async () => {
    await renderEditor()

    expect(screen.queryByLabelText(/source code link/i)).not.toBeInTheDocument()
    // Category stays.
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  })
})

describe("loadout editor — item links", () => {
  beforeEach(() => stubFetch(THREE_ITEMS))

  it("links a private item to its workspace page in the same tab", async () => {
    await renderEditor()

    const link = screen.getByRole("link", { name: /chart-reading/i })
    expect(link).toHaveAttribute("href", "/dashboard/manage/skill-9")
    expect(link).not.toHaveAttribute("target")
  })

  it("opens a public item's marketplace page in a new tab", async () => {
    await renderEditor()

    const link = screen.getByRole("link", { name: /near-rpc/i })
    expect(link).toHaveAttribute("href", "/marketplace/near-rpc")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })

  it("leaves an unresolvable item unlinked, since it has no page", async () => {
    stubFetch([
      item({
        memberId: "m-dead",
        source: "public",
        kind: "tool",
        name: "dead-tool",
        status: "missing",
        reason: "dead-tool is no longer published upstream.",
        href: null,
        blocksInstall: true,
      }),
    ])
    await renderEditor()

    expect(
      screen.queryByRole("link", { name: /dead-tool/i })
    ).not.toBeInTheDocument()
    expect(screen.getByTestId("item-m-dead")).toHaveTextContent("dead-tool")
  })
})

describe("loadout editor — health", () => {
  beforeEach(() => {
    stubFetch([
      item({
        memberId: "m-1",
        source: "private",
        kind: "tool",
        name: "market-data",
        currentDigest: "e".repeat(64),
        currentVersion: "1.1.0",
        status: "drifted",
        reason: "market-data was replaced after this loadout was published.",
        blocksInstall: true,
        href: "/dashboard/manage/tool-3",
      }),
      item({
        memberId: "m-2",
        source: "public",
        kind: "skill",
        name: "chart-reading",
        status: "updated_upstream",
        reason: "chart-reading was re-released upstream with new content.",
        href: "/marketplace/chart-reading",
      }),
    ])
  })

  it("names every failing item and its reason rather than only the first", async () => {
    await renderEditor()

    expect(screen.getByText(/2 of 2 items need attention/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/market-data was replaced after this loadout/i).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/chart-reading was re-released upstream/i).length
    ).toBeGreaterThan(0)
  })

  it("distinguishes a drifted private item from a public one updated upstream", async () => {
    await renderEditor()

    const drifted = screen.getByTestId("item-m-1")
    const upstream = screen.getByTestId("item-m-2")

    expect(drifted).toHaveTextContent(/drifted/i)
    expect(drifted).toHaveTextContent(/blocks installs/i)
    expect(upstream).toHaveTextContent(/updated upstream/i)
    expect(upstream).toHaveTextContent(/installs continue/i)
    expect(upstream).not.toHaveTextContent(/blocks installs/i)
  })

  it("says to publish again to update, rather than offering a second action for it", async () => {
    await renderEditor()

    expect(
      screen.getByText(/publish this loadout again to record what resolves now/i)
    ).toBeInTheDocument()
  })

  it("reads drift as blocking installs only, never as blocking the publish that repairs it", async () => {
    await renderEditor()

    // Publishing is the only thing that re-pins, so copy implying the owner
    // must clear the drift first would describe a deadlock.
    expect(screen.getByText(/publishing is available/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /publish update/i })
    ).toBeEnabled()
    // The drifted row states the install consequence and claims no other.
    const drifted = screen.getByTestId("item-m-1")
    expect(drifted).toHaveTextContent(/blocks installs/i)
    expect(drifted).not.toHaveTextContent(/cannot be published/i)
  })
})

describe("loadout editor — actions", () => {
  beforeEach(() => stubFetch(THREE_ITEMS))

  it("keeps Save changes and Publish together as two distinct actions", async () => {
    await renderEditor()

    const save = screen.getByRole("button", { name: /save changes/i })
    const publish = screen.getByRole("button", { name: /publish update/i })
    expect(save).toBeInTheDocument()
    expect(publish).toBeInTheDocument()
    // One bar holds both, so neither is stranded away from what it commits.
    expect(save.closest("div.sticky")).toBe(publish.closest("div.sticky"))
  })

  it("saves the record without publishing it", async () => {
    await renderEditor()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    })

    const patches = vi
      .mocked(fetch)
      .mock.calls.filter(([, init]) => init?.method === "PATCH")
    expect(patches).toHaveLength(1)
    // A loadout has no repository, so its save never carries one.
    expect(JSON.parse(String(patches[0][1]?.body))).not.toHaveProperty(
      "sourceUrl"
    )
    expect(publishCalls).toBe(0)
  })

  it("publishes on its own action, which is what re-pins every item", async () => {
    await renderEditor()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /publish update/i }))
    })

    expect(publishCalls).toBe(1)
  })

  it("disables Publish when the server's checks do not pass", async () => {
    stubFetch(THREE_ITEMS, { publishable: false })
    await renderEditor()

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /publish update/i })
      ).toBeDisabled()
    )
    expect(
      screen.getByText(/some checks below are not passing yet/i)
    ).toBeInTheDocument()
  })
})

describe("loadout editor — install disclosure", () => {
  beforeEach(() => stubFetch(THREE_ITEMS))

  it("presents install as unavailable with the reason, and offers no control that could install", async () => {
    await renderEditor()

    expect(
      screen.getByText(/installing a loadout is not available yet/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^install/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /deploy/i })
    ).not.toBeInTheDocument()
  })

  it("reads the soul by the id in its own link, not by matching names", async () => {
    await renderEditor()

    const region = await waitFor(() =>
      screen.getByRole("group", { name: "Soul document" })
    )
    expect(region.textContent).toBe(SOUL_TEXT)
    // The document came from the id carried in href, so no artifact-list
    // lookup was needed to find it.
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input]) => String(input))
        .filter((url) => url.includes("/content/soul_md"))
    ).toEqual(["/api/private-artifacts/soul-1/content/soul_md"])
  })

  it("lists every other item by kind, name and version", async () => {
    await renderEditor()

    const listed = screen.getByText(/everything else this loadout installs/i)
      .parentElement as HTMLElement
    expect(listed).toHaveTextContent("chart-reading")
    expect(listed).toHaveTextContent("1.4.0")
    expect(listed).toHaveTextContent("near-rpc")
    expect(listed).toHaveTextContent("2.3.1")
    expect(listed).not.toHaveTextContent("careful-analyst")
  })
})

describe("loadout editor — an empty loadout", () => {
  beforeEach(() => stubFetch([]))

  it("prompts on each kind's own card", async () => {
    await renderEditor()

    expect(
      screen.getByRole("button", { name: /choose a soul/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /add skills/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /add tools/i })
    ).toBeInTheDocument()
  })

  it("says it would install nothing", async () => {
    await renderEditor()

    expect(
      screen.getByText(/no items, so it would install nothing/i)
    ).toBeInTheDocument()
  })
})
