import { forwardRef } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Forwards every prop (role, tabIndex, event handlers, the ref) through to
// the rendered <a>, not just children/href: DropdownMenuItem's `asChild`
// merges those onto this component via Radix's Slot, and without them the
// item never gets its ref attached to a real node (Radix's roving focus
// then throws trying to .focus() a candidate whose ref is still null) or
// its menuitem role and keyboard handlers.
vi.mock("next/link", () => ({
  default: forwardRef<
    HTMLAnchorElement,
    { children: React.ReactNode; href: string }
  >(function Link({ children, href, ...props }, ref) {
    return (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    )
  }),
}))

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test mock, not a page
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

const featureFlags = vi.hoisted(() => ({
  isWorkspaceRouteDisabled: false,
  isAccountRouteDisabled: false,
}))
vi.mock("@/lib/shared/feature-flags", () => featureFlags)

type MockSession = {
  user: { id: string; name?: string | null; email?: string | null }
} | null

const accountActions = vi.hoisted(() => ({
  session: null as MockSession,
  isPending: false,
  isSigningOut: false,
  signOut: vi.fn(),
}))
vi.mock("@/features/account/hooks/use-account-actions", () => ({
  useAccountActions: () => accountActions,
}))

import { UserMenu } from "../user-menu"

async function openMenu() {
  const trigger = screen.getByRole("button", { name: /account menu/i })
  // A tick before and after the keypress lets radix-ui's roving focus group
  // finish registering its items before it tries to focus one -- without
  // this, opening synchronously right after mount races that registration.
  await act(async () => {
    await Promise.resolve()
  })
  // A real keyboard interaction focuses the trigger before activating it;
  // without that, radix's focus-scope has no element to restore focus to
  // when the menu later closes.
  trigger.focus()
  await act(async () => {
    fireEvent.keyDown(trigger, { key: "Enter" })
    await Promise.resolve()
  })
  return trigger
}

describe("UserMenu", () => {
  beforeEach(() => {
    featureFlags.isWorkspaceRouteDisabled = false
    featureFlags.isAccountRouteDisabled = false
    accountActions.session = null
    accountActions.isPending = false
    accountActions.isSigningOut = false
    accountActions.signOut = vi.fn()
  })

  it("offers a sign-in action instead of a menu when no member is signed in", () => {
    render(<UserMenu />)

    const signIn = screen.getByRole("link", { name: /sign in/i })
    expect(signIn).toHaveAttribute("href", "/account")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("hides the sign-in control entirely when the account route is disabled", () => {
    featureFlags.isAccountRouteDisabled = true
    render(<UserMenu />)

    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument()
  })

  it("opens a menu offering IronHub, Private Space, and Account, plus Sign out, in order", async () => {
    accountActions.session = {
      user: { id: "u1", name: "Alice", email: "alice@example.com" },
    }
    render(<UserMenu />)
    await openMenu()

    const items = await screen.findAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "IronHub",
      "Private Space",
      "Account",
      "Sign out",
    ])
  })

  it("shows the member's full identity inside the menu, and not truncated in the trigger", async () => {
    const nearAccountId =
      "0x8f84f5d6ad33f00112233445566778899aabbccddeeff00112233445566778"
    accountActions.session = {
      user: { id: "u1", name: nearAccountId, email: null },
    }
    render(<UserMenu />)

    // The trigger identifies by avatar, not by printing the raw address.
    const trigger = screen.getByRole("button", { name: /account menu/i })
    expect(trigger).not.toHaveTextContent(nearAccountId)

    await openMenu()
    expect(await screen.findByText(nearAccountId)).toBeInTheDocument()
  })

  it("omits Private Space when the workspace route is disabled for this deployment", async () => {
    featureFlags.isWorkspaceRouteDisabled = true
    accountActions.session = { user: { id: "u1", name: "Alice", email: null } }
    render(<UserMenu />)
    await openMenu()

    await screen.findByRole("menuitem", { name: /ironhub/i })
    expect(
      screen.queryByRole("menuitem", { name: /private space/i })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /^account$/i })
    ).toBeInTheDocument()
  })

  it("omits Account when the account route is disabled for this deployment", async () => {
    featureFlags.isAccountRouteDisabled = true
    accountActions.session = { user: { id: "u1", name: "Alice", email: null } }
    render(<UserMenu />)
    await openMenu()

    await screen.findByRole("menuitem", { name: /ironhub/i })
    expect(
      screen.queryByRole("menuitem", { name: /^account$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /private space/i })
    ).toBeInTheDocument()
  })

  it("signs the member out when Sign out is chosen", async () => {
    accountActions.session = { user: { id: "u1", name: "Alice", email: null } }
    render(<UserMenu />)
    await openMenu()

    const signOutItem = await screen.findByRole("menuitem", {
      name: /sign out/i,
    })
    fireEvent.click(signOutItem)

    expect(accountActions.signOut).toHaveBeenCalledTimes(1)
  })

  it("closes on Escape and returns focus to the trigger", async () => {
    accountActions.session = { user: { id: "u1", name: "Alice", email: null } }
    render(<UserMenu />)
    const trigger = await openMenu()

    await screen.findByRole("menuitem", { name: /ironhub/i })

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
      // Focus-scope restores focus to the trigger from a setTimeout(0) on
      // unmount (radix-ui internals), not a microtask -- a bare
      // Promise.resolve() doesn't wait long enough for it to run.
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
