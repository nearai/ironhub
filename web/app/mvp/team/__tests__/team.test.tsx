import { act } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    useSession: vi.fn(),
    organization: {
      listMembers: vi.fn(),
      listInvitations: vi.fn(),
      inviteMember: vi.fn(),
      cancelInvitation: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
    },
  },
}))

import { authClient } from "@/lib/auth/client"
import type { OrgMember } from "@/features/partner/api/orgs"
import type { OrgInvitation } from "@/features/partner/api/invitations"
import { ToastProvider } from "@/features/partner/store/toast-provider"
import TeamPage from "../page"

const mockMembers: OrgMember[] = [
  {
    id: "m-owner",
    userId: "u-owner",
    role: "owner",
    createdAt: "2026-01-01T00:00:00.000Z",
    user: { name: "Alice Owner", email: "alice@example.com" },
  },
  {
    id: "m-admin",
    userId: "u-admin",
    role: "admin",
    createdAt: "2026-01-02T00:00:00.000Z",
    user: { name: "Bob Admin", email: "bob@example.com" },
  },
  {
    id: "m-member",
    userId: "u-member",
    role: "member",
    createdAt: "2026-01-03T00:00:00.000Z",
    user: { name: "Charlie Member", email: "charlie@example.com" },
  },
]

const mockInvitations: OrgInvitation[] = [
  {
    id: "inv-1",
    organizationId: "org-1",
    email: "pending@example.com",
    role: "member",
    status: "pending",
    expiresAt: "2026-02-01T00:00:00.000Z",
  },
]

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TeamPage />
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return queryClient
}

describe("TeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: { id: "u-owner", name: "Alice Owner", email: "alice@example.com" },
        session: { activeOrganizationId: "org-1" },
      },
    } as never)
    vi.mocked(authClient.organization.listMembers).mockResolvedValue({
      data: { members: mockMembers },
      error: null,
    } as never)
    vi.mocked(authClient.organization.listInvitations).mockResolvedValue({
      data: mockInvitations,
      error: null,
    } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("(a) invite dialog lifecycle", () => {
    it("opens on 'Invite member', closes on 'Cancel', and closes after a successful invitation submit", async () => {
      vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
        data: { id: "inv-2", email: "new@example.com", role: "member" },
        error: null,
      } as never)

      await renderPage()

      await waitFor(() => {
        expect(screen.getByText("People with access (3)")).toBeInTheDocument()
      })

      // Dialog is closed initially
      expect(screen.queryByText("Invite someone")).not.toBeInTheDocument()

      // Clicking "Invite member" opens it
      const inviteBtn = screen.getByRole("button", { name: /invite member/i })
      fireEvent.click(inviteBtn)

      expect(screen.getByText("Invite someone")).toBeInTheDocument()
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toBeInTheDocument()

      // Clicking "Cancel" closes it
      const cancelBtn = screen.getByRole("button", { name: /^cancel$/i })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByText("Invite someone")).not.toBeInTheDocument()
      })

      // Reopen and submit successfully
      fireEvent.click(inviteBtn)
      await waitFor(() => {
        expect(screen.getByText("Invite someone")).toBeInTheDocument()
      })

      const emailInputReopened = screen.getByLabelText(/email address/i)
      fireEvent.change(emailInputReopened, { target: { value: "new@example.com" } })

      const submitBtn = screen.getByRole("button", { name: /send invitation/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          organizationId: "org-1",
          email: "new@example.com",
          role: "member",
        })
      })

      // Dialog content is gone after the mutation resolves
      await waitFor(() => {
        expect(screen.queryByText("Invite someone")).not.toBeInTheDocument()
      })
    })
  })

  describe("(b) members table role rendering", () => {
    it("renders roles; signed-in owner sees editable selects for others and a read-only badge for self", async () => {
      vi.mocked(authClient.organization.updateMemberRole).mockResolvedValue({
        data: { id: "m-member", role: "admin" },
        error: null,
      } as never)

      await renderPage()

      await waitFor(() => {
        expect(screen.getByText("Alice Owner")).toBeInTheDocument()
        expect(screen.getByText("Bob Admin")).toBeInTheDocument()
        expect(screen.getByText("Charlie Member")).toBeInTheDocument()
      })

      const aliceRow = screen.getByText("Alice Owner").closest("tr")!
      const bobRow = screen.getByText("Bob Admin").closest("tr")!
      const charlieRow = screen.getByText("Charlie Member").closest("tr")!

      // Owner's own row renders a plain read-only role badge, not a select
      expect(screen.queryByLabelText("Role for Alice Owner")).not.toBeInTheDocument()
      expect(within(aliceRow).getByText("Owner")).toBeInTheDocument()
      expect(within(aliceRow).queryByRole("combobox")).not.toBeInTheDocument()

      // Other members' rows render editable role selects
      const bobSelect = within(bobRow).getByLabelText("Role for Bob Admin")
      expect(bobSelect).toBeInTheDocument()
      expect(bobSelect).toHaveValue("admin")

      const charlieSelect = within(charlieRow).getByLabelText("Role for Charlie Member")
      expect(charlieSelect).toBeInTheDocument()
      expect(charlieSelect).toHaveValue("member")

      // Changing role calls updateMemberRole
      fireEvent.change(charlieSelect, { target: { value: "admin" } })
      await waitFor(() => {
        expect(authClient.organization.updateMemberRole).toHaveBeenCalledWith({
          organizationId: "org-1",
          memberId: "m-member",
          role: "admin",
        })
      })
    })
  })

  describe("(c) owner-row removal permissions", () => {
    it("signed in as ADMIN: member row shows remove button, owner row does NOT, own row does NOT", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: {
          user: { id: "u-admin", name: "Bob Admin", email: "bob@example.com" },
          session: { activeOrganizationId: "org-1" },
        },
      } as never)

      await renderPage()

      await waitFor(() => {
        expect(screen.getByText("People with access (3)")).toBeInTheDocument()
      })

      // Member row has remove button
      expect(screen.getByRole("button", { name: "Remove Charlie Member" })).toBeInTheDocument()

      // Owner row does NOT have remove button (only owner may remove owner)
      expect(screen.queryByRole("button", { name: "Remove Alice Owner" })).not.toBeInTheDocument()

      // Self row (Bob Admin) does NOT have remove button
      expect(screen.queryByRole("button", { name: "Remove Bob Admin" })).not.toBeInTheDocument()
    })

    it("signed in as OWNER: other rows show remove button, own row does NOT", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: {
          user: { id: "u-owner", name: "Alice Owner", email: "alice@example.com" },
          session: { activeOrganizationId: "org-1" },
        },
      } as never)

      await renderPage()

      await waitFor(() => {
        expect(screen.getByText("People with access (3)")).toBeInTheDocument()
      })

      // Can remove admin
      expect(screen.getByRole("button", { name: "Remove Bob Admin" })).toBeInTheDocument()

      // Can remove member
      expect(screen.getByRole("button", { name: "Remove Charlie Member" })).toBeInTheDocument()

      // Cannot remove self
      expect(screen.queryByRole("button", { name: "Remove Alice Owner" })).not.toBeInTheDocument()
    })
  })
})
