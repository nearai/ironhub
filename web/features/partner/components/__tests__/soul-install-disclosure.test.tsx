import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Read at module scope, so it has to be mocked rather than set here. The
// disclosure only matters where an install can actually be started.
const featureFlags = vi.hoisted(() => ({ isAgentInstallEnabled: true }))
vi.mock("@/lib/shared/feature-flags", () => featureFlags)

import { SecureInstallButton } from "@/features/marketplace/components/secure-install-button"

const SOUL_TEXT =
  "# Who you are\n\nYou are a careful analyst who cites every claim."

function renderSoulInstall() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SecureInstallButton
        slug="careful-analyst"
        source="private"
        type="soul"
        artifactId="art-1"
      />
    </QueryClientProvider>
  )
}

describe("soul install disclosure", () => {
  beforeEach(() => {
    featureFlags.isAgentInstallEnabled = true
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "/api/private-artifacts/art-1/content/soul_md") {
          return new Response(SOUL_TEXT, { status: 200 })
        }
        if (url === "/api/install-intents") {
          return new Response(
            JSON.stringify({
              redirectUrl: "https://agent.example/#/install/careful-analyst",
              message: "signed",
              expiresAt: new Date(Date.now() + 300_000).toISOString(),
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
    )
    vi.stubGlobal("open", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** The scrollable region the document is rendered into, once it has loaded. */
  async function soulRegion() {
    return waitFor(() => screen.getByRole("group", { name: "Soul document" }))
  }

  it("shows the complete soul document before any install control appears", async () => {
    renderSoulInstall()

    // Compared verbatim, not through the text matcher's whitespace
    // normalization: the blank lines are part of the document being disclosed.
    await waitFor(async () =>
      expect((await soulRegion()).textContent).toBe(SOUL_TEXT)
    )
    // The install control is not merely disabled -- it is not there yet. The
    // document is what the reader is being asked to trust.
    expect(
      screen.queryByRole("button", { name: /install to agent/i })
    ).not.toBeInTheDocument()
  })

  it("puts the document in its own scrollable region rather than in the page flow", async () => {
    renderSoulInstall()

    const region = await soulRegion()
    expect(region.className).toContain("overflow-auto")
    expect(region).toHaveAttribute("tabindex", "0")
  })

  it("says that where the soul lands on the agent is not yet guaranteed", async () => {
    renderSoulInstall()

    await soulRegion()
    expect(screen.getByText(/not yet guaranteed/i)).toBeInTheDocument()
  })

  it("reveals the install control only after the reader confirms, and starts no intent before that", async () => {
    renderSoulInstall()

    await soulRegion()
    const intentCalls = () =>
      vi
        .mocked(fetch)
        .mock.calls.filter(([input]) => String(input) === "/api/install-intents")
    expect(intentCalls()).toHaveLength(0)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /i have read this/i }))
    })

    const installButton = screen.getByRole("button", {
      name: /install to agent/i,
    })
    expect(installButton).toBeInTheDocument()
    expect(intentCalls()).toHaveLength(0)

    await act(async () => {
      fireEvent.click(installButton)
    })
    expect(intentCalls()).toHaveLength(1)
    expect(JSON.parse(String(intentCalls()[0][1]?.body))).toMatchObject({
      slug: "careful-analyst",
      source: "private",
      type: "soul",
    })
  })

  it("offers no install at all when the document cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 }))
    )

    renderSoulInstall()

    await waitFor(() =>
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
    )
    expect(
      screen.queryByRole("button", { name: /i have read this/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /install to agent/i })
    ).not.toBeInTheDocument()
  })
})
