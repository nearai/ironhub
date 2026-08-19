import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SecureInstallButton } from "../secure-install-button"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

// isAgentInstallEnabled is read at module scope, so setting process.env in a
// test body is too late -- mock the flags module instead. This suite
// exercises the button's own behaviour, so it runs with the feature on; the
// flag's on/off gating itself is covered separately below.
const featureFlags = vi.hoisted(() => ({ isAgentInstallEnabled: true }))
vi.mock("@/lib/shared/feature-flags", () => featureFlags)

/**
 * The install click-through window is the only deadline a user can miss: the
 * agent refuses a delivery whose timestamp is more than 300 s old (C16) and
 * nothing hub-side can widen that. Before this component it was returned by
 * the API as `expiresAt` and rendered nowhere, so a user who took too long saw
 * an agent error about a timestamp with no indication a deadline had existed.
 */
function intentResponse(expiresInMs = 300_000) {
  return new Response(
    JSON.stringify({
      redirectUrl: "https://agent.example/#/install/firecrawl?sig=abc",
      message: "signed",
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}

/** Clicks and lets the intent request settle, so assertions see the result. */
async function clickButton(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }))
  })
}

describe("SecureInstallButton", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.stubGlobal("fetch", vi.fn())
    vi.stubGlobal("open", vi.fn())
    push.mockClear()
    featureFlags.isAgentInstallEnabled = true
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("states the click-through deadline before the install is started", () => {
    render(<SecureInstallButton slug="firecrawl" />)

    expect(
      screen.getByText(/You have 5 minutes to approve the install/)
    ).toBeInTheDocument()
  })

  it("shows a countdown against expiresAt that decreases", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(intentResponse())
    render(<SecureInstallButton slug="firecrawl" />)

    await clickButton(/Install to Agent/)

    await waitFor(() =>
      expect(screen.getByText(/Approve this install/)).toBeInTheDocument()
    )
    expect(screen.getByText("5:00")).toBeInTheDocument()

    // The agent opens in a new tab rather than replacing this page, which is
    // what leaves a surface for the deadline to live on.
    expect(window.open).toHaveBeenCalledWith(
      "https://agent.example/#/install/firecrawl?sig=abc",
      "_blank",
      "noopener,noreferrer"
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    await waitFor(() => expect(screen.getByText("4:57")).toBeInTheDocument())
    expect(screen.queryByText("5:00")).not.toBeInTheDocument()
  })

  it("switches to an expired state offering a re-issue once the deadline passes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(intentResponse(2000))
    render(<SecureInstallButton slug="firecrawl" />)

    await clickButton(/Install to Agent/)
    await waitFor(() =>
      expect(screen.getByText(/Approve this install/)).toBeInTheDocument()
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    await waitFor(() =>
      expect(screen.getByText(/This install link expired/)).toBeInTheDocument()
    )
    expect(
      screen.getByRole("button", { name: /Issue a new install link/ })
    ).toBeInTheDocument()
    expect(screen.queryByText(/Approve this install/)).not.toBeInTheDocument()
  })

  it("re-issuing requests a fresh intent rather than reusing the expired one", async () => {
    // Built lazily: `expiresAt` is relative to the moment the response is
    // produced, and the re-issue happens after the clock has been advanced.
    vi.mocked(fetch)
      .mockImplementationOnce(async () => intentResponse(2000))
      .mockImplementationOnce(async () => intentResponse())
    render(<SecureInstallButton slug="firecrawl" />)

    await clickButton(/Install to Agent/)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    await waitFor(() =>
      expect(screen.getByText(/This install link expired/)).toBeInTheDocument()
    )

    await clickButton(/Issue a new install link/)

    await waitFor(() => expect(screen.getByText("5:00")).toBeInTheDocument())
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it("renders an agent stale-timestamp rejection as the expired state, not as raw error text", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "StaleTimestamp" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    )
    render(<SecureInstallButton slug="firecrawl" />)

    await clickButton(/Install to Agent/)

    await waitFor(() =>
      expect(screen.getByText(/This install link expired/)).toBeInTheDocument()
    )
    // The agent's own word for it names a constant the user has never heard of
    // and says nothing about what to do next.
    expect(screen.queryByText("StaleTimestamp")).not.toBeInTheDocument()
  })

  it("still surfaces an unrelated failure as an error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "Agent Installation is not verified." }),
        { status: 400, headers: { "content-type": "application/json" } }
      )
    )
    render(<SecureInstallButton slug="firecrawl" />)

    await clickButton(/Install to Agent/)

    await waitFor(() =>
      expect(
        screen.getByText("Agent Installation is not verified.")
      ).toBeInTheDocument()
    )
    expect(
      screen.queryByText(/This install link expired/)
    ).not.toBeInTheDocument()
  })

  it("does not surface the artifact download window", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(intentResponse())
    const { container } = render(<SecureInstallButton slug="firecrawl" />)

    await clickButton(/Install to Agent/)
    await waitFor(() =>
      expect(screen.getByText(/Approve this install/)).toBeInTheDocument()
    )

    // The token lives 15 minutes, the user takes no action during it, and a
    // second number on screen would only obscure the one they can miss.
    expect(container.textContent).not.toMatch(/15 minutes|15:00/)
  })

  // The agent has no route that consumes the install deep link this button
  // produces, so until that lands upstream the button must render nothing
  // rather than promise an install that silently goes nowhere.
  describe("agent install flag", () => {
    it("renders nothing when isAgentInstallEnabled is off", () => {
      featureFlags.isAgentInstallEnabled = false
      const { container } = render(<SecureInstallButton slug="firecrawl" />)

      expect(container).toBeEmptyDOMElement()
    })

    it("renders normally when isAgentInstallEnabled is on", () => {
      featureFlags.isAgentInstallEnabled = true
      render(<SecureInstallButton slug="firecrawl" />)

      expect(
        screen.getByRole("button", { name: /Install to Agent/ })
      ).toBeInTheDocument()
    })
  })
})
