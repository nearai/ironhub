import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    organization: {
      listInvitations: vi.fn(),
      inviteMember: vi.fn(),
      cancelInvitation: vi.fn(),
    },
  },
}))

import { authClient } from "@/lib/auth/client"
import {
  useAcceptInvitation,
  useCreateInvitation,
  usePendingInvitations,
} from "../invitations"

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("invitations API hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lists pending invitations for the signed-in user via the custom route", async () => {
    // BetterAuth's listUserInvitations hard-403s emailVerified=false users
    // (every NEAR-wallet user), so this must go through /api/orgs/invitations/pending.
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          invitations: [
            {
              id: "inv1",
              organizationId: "org1",
              organization: { id: "org1", name: "Acme" },
              email: "member@example.com",
              role: "member",
              status: "pending",
              expiresAt: "2026-01-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 }
      )
    )

    const { result } = renderHook(() => usePendingInvitations(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetch).toHaveBeenCalledWith(
      "/api/orgs/invitations/pending",
      expect.objectContaining({})
    )
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].email).toBe("member@example.com")
    expect(result.current.data?.[0].organizationName).toBe("Acme")
  })

  it("accepts an invitation via the custom route with setActive", async () => {
    // Same emailVerified constraint as above applies to acceptInvitation.
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ invitation: { id: "inv1" } }), { status: 200 })
    )

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper })

    await result.current.mutateAsync({ invitationId: "inv1", setActive: true })

    expect(fetch).toHaveBeenCalledWith(
      "/api/orgs/invitations/inv1/accept",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ setActive: true }),
      })
    )
  })

  it("creates an invitation by email + role via authClient.organization", async () => {
    vi.mocked(authClient.organization.inviteMember).mockResolvedValueOnce({
      data: { id: "inv2", email: "new@example.com", role: "member" },
      error: null,
    } as never)

    const { result } = renderHook(() => useCreateInvitation("org1"), { wrapper })

    await result.current.mutateAsync({ email: "new@example.com", role: "member" })

    expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
      organizationId: "org1",
      email: "new@example.com",
      role: "member",
    })
  })
})
