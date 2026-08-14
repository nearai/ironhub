import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    organization: {
      listUserInvitations: vi.fn(),
      acceptInvitation: vi.fn(),
      rejectInvitation: vi.fn(),
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
  it("lists pending invitations for the signed-in user", async () => {
    vi.mocked(authClient.organization.listUserInvitations).mockResolvedValueOnce({
      data: [
        {
          id: "inv1",
          organizationId: "org1",
          organizationName: "Acme",
          email: "member@example.com",
          role: "member",
          status: "pending",
          expiresAt: "2026-01-08T00:00:00.000Z",
        },
      ],
      error: null,
    } as never)

    const { result } = renderHook(() => usePendingInvitations(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].email).toBe("member@example.com")
  })

  it("accepts an invitation and invalidates pending invitations", async () => {
    vi.mocked(authClient.organization.acceptInvitation).mockResolvedValueOnce({
      data: { invitation: { id: "inv1" } },
      error: null,
    } as never)

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper })

    await result.current.mutateAsync("inv1")

    expect(authClient.organization.acceptInvitation).toHaveBeenCalledWith({
      invitationId: "inv1",
    })
  })

  it("creates an invitation by email + role", async () => {
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
