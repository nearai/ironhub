import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AgentInstallationForm } from "../agent-installation-form"

/**
 * This form is the only place a user learns that IronHub and their IronClaw
 * agent talk over a shared secret, that a generated key must be copied onto
 * the agent and the agent restarted, or that a pasted key has to be the
 * exact one the agent is already running with. These tests cover the two
 * paths the user chooses between and the controls on the key field itself.
 */
function generateResponse(sharedKey: string) {
  return new Response(JSON.stringify({ sharedKey }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

const AUTO_KEY = `ihub_sk_${"a".repeat(40)}`

describe("AgentInstallationForm", () => {
  beforeEach(() => {
    window.localStorage.clear()
    // The form mints a key as soon as it opens, so every render performs this
    // call -- a factory, not a fixed value, because a Response body can only
    // be consumed once.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(generateResponse(AUTO_KEY)))
    )
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it("defaults to the generate option and shows its restart instructions", () => {
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    expect(
      screen.getByRole("button", { name: "Generate a key" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.getByRole("button", { name: "Use a key from IronClaw" })
    ).toHaveAttribute("aria-pressed", "false")
    expect(
      screen.getByText(/Set this on the machine running your IronClaw agent/)
    ).toBeInTheDocument()
  })

  it("switches to the paste option and swaps in its instructions", () => {
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Use a key from IronClaw" })
    )

    expect(
      screen.getByRole("button", { name: "Use a key from IronClaw" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.getByText(
        /Paste the key your IronClaw agent is already running with/
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Set this on the machine running your IronClaw agent/)
    ).not.toBeInTheDocument()
    // The generate button only makes sense when the hub is minting the key.
    expect(
      screen.queryByRole("button", { name: "Generate shared key" })
    ).not.toBeInTheDocument()
  })

  it("opens with a key already minted, without the user asking for one", async () => {
    const sharedKey = `ihub_sk_${"b".repeat(40)}`
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(generateResponse(sharedKey))
    )
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByLabelText("IronClaw shared key")).toHaveValue(
        sharedKey
      )
    )
    // Minted here, so it is also remembered here: a reload must not hand the
    // user a different key from the one their agent was configured with.
    expect(window.localStorage.getItem("ironhub.account.agentSharedKey")).toBe(
      sharedKey
    )
    // A generated key is revealed immediately -- there is nothing sensitive
    // about seeing what the hub itself just produced.
    expect(screen.getByLabelText("IronClaw shared key")).toHaveAttribute(
      "type",
      "text"
    )
  })

  it("restores the key this browser already holds instead of minting another", async () => {
    const stored = `ihub_sk_${"d".repeat(40)}`
    window.localStorage.setItem("ironhub.account.agentSharedKey", stored)
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByLabelText("IronClaw shared key")).toHaveValue(stored)
    )
    expect(fetch).not.toHaveBeenCalled()
    // A key carried over from a previous visit stays masked: the user asked
    // for it to be here, not for it to be on screen.
    expect(screen.getByLabelText("IronClaw shared key")).toHaveAttribute(
      "type",
      "password"
    )
  })

  it("copies the shared key to the clipboard", async () => {
    const sharedKey = `ihub_sk_${"c".repeat(40)}`
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(generateResponse(sharedKey))
    )
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByLabelText("IronClaw shared key")).toHaveValue(
        sharedKey
      )
    )

    fireEvent.click(screen.getByRole("button", { name: "Copy shared key" }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sharedKey)
  })

  it("reveals and hides a key the user pasted in, not just a generated one", () => {
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Use a key from IronClaw" })
    )
    const input = screen.getByLabelText("IronClaw shared key")
    fireEvent.change(input, { target: { value: "ihub_sk_pasted-value" } })
    expect(input).toHaveAttribute("type", "password")

    fireEvent.click(screen.getByRole("button", { name: "Show shared key" }))
    expect(input).toHaveAttribute("type", "text")

    fireEvent.click(screen.getByRole("button", { name: "Hide shared key" }))
    expect(input).toHaveAttribute("type", "password")
  })

  it("hints at an obviously invalid pasted key without blocking submit", () => {
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Use a key from IronClaw" })
    )
    fireEvent.change(screen.getByLabelText("IronClaw shared key"), {
      target: { value: "wrong-prefix" },
    })

    expect(screen.getByText(/IronClaw keys start with/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Verify connection" })
    ).not.toBeDisabled()
  })

  it("keeps the setup snippet in step with the reveal toggle, but copies the real command", async () => {
    const sharedKey = `ihub_sk_${"e".repeat(40)}`
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(generateResponse(sharedKey))
    )
    render(<AgentInstallationForm isPending={false} onSubmit={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByLabelText("IronClaw shared key")).toHaveValue(
        sharedKey
      )
    )

    // Generate reveals, so the snippet shows the whole command.
    expect(
      screen.getByText(new RegExp(`IRONHUB_AGENT_SHARED_KEY=${sharedKey}`))
    ).toBeInTheDocument()

    // Hiding the field has to hide it here too, or the toggle means nothing.
    fireEvent.click(screen.getByRole("button", { name: "Hide shared key" }))
    expect(
      screen.queryByText(new RegExp(`IRONHUB_AGENT_SHARED_KEY=${sharedKey}`))
    ).not.toBeInTheDocument()
    expect(screen.getByText(/•/)).toBeInTheDocument()

    // Copy is unaffected: what lands on the clipboard is always runnable.
    fireEvent.click(screen.getByRole("button", { name: "Copy setup command" }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `export IRONHUB_AGENT_SHARED_KEY=${sharedKey}\nironclaw serve`
    )
  })
})
