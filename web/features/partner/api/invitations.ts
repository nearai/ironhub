"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth/client"
import { fetchJson } from "./client"
import type { OrgRole } from "./orgs"

export interface OrgInvitation {
  id: string
  organizationId: string
  organizationName?: string
  email: string
  /** NEAR account id this invitation was addressed to, when it has one. */
  accountId?: string | null
  role: OrgRole | null
  status: string
  expiresAt: string
}

const orgInvitationsKey = (organizationId: string) =>
  ["organizations", organizationId, "invitations"] as const
const pendingInvitationsKey = ["invitations", "pending"] as const

function unwrap<T>(result: {
  data: T | null
  error: { message?: string } | null
}): T {
  if (result.error) {
    throw new Error(result.error.message || "Invitation request failed.")
  }
  if (result.data === null) {
    throw new Error("Invitation request returned no data.")
  }
  return result.data
}

/**
 * Invitations created by/for this organization (owner/admin view).
 *
 * Uses the custom route rather than `authClient.organization.listInvitations`
 * so each row carries the invitee's NEAR account id: a wallet user's stored
 * address is a `temp-…` placeholder that means nothing to a human reader.
 */
export function useOrgInvitations(organizationId: string | undefined) {
  return useQuery({
    queryKey: organizationId
      ? orgInvitationsKey(organizationId)
      : ["organizations", "unknown", "invitations"],
    queryFn: () =>
      fetchJson<{ invitations: OrgInvitation[] }>(
        `/api/orgs/${organizationId}/invitations`
      ).then((data) => data.invitations),
    enabled: Boolean(organizationId),
  })
}

/**
 * Invite by email address or NEAR account id.
 *
 * Uses the custom `/api/orgs/[organizationId]/invitations` route rather than
 * `authClient.organization.inviteMember`: BetterAuth only accepts an email,
 * and a wallet user never knows theirs — it is derived from their account id
 * on first sign-in. The route resolves either identifier server-side.
 */
export function useCreateInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ identifier, role }: { identifier: string; role: OrgRole }) =>
      fetchJson<{ invitation: OrgInvitation }>(
        `/api/orgs/${organizationId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({ identifier, role }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orgInvitationsKey(organizationId),
      })
    },
  })
}

export function useCancelInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orgInvitationsKey(organizationId),
      })
    },
  })
}

interface RawPendingInvitation {
  id: string
  organizationId: string
  email: string
  role: OrgRole | null
  status: string
  expiresAt: string
  organization?: { id: string; name: string } | null
}

/**
 * Invitations pending for the signed-in user, across all orgs (by email).
 *
 * Uses the custom `/api/orgs/invitations/pending` route: BetterAuth's
 * `listUserInvitations` endpoint hard-403s users with `emailVerified=false`,
 * which is every NEAR-wallet user in this app.
 */
export function usePendingInvitations() {
  return useQuery({
    queryKey: pendingInvitationsKey,
    queryFn: async () => {
      const data = await fetchJson<{ invitations: RawPendingInvitation[] }>(
        "/api/orgs/invitations/pending"
      )
      return data.invitations.map(
        (invite): OrgInvitation => ({
          id: invite.id,
          organizationId: invite.organizationId,
          organizationName: invite.organization?.name,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
        })
      )
    },
    refetchInterval: 60_000,
  })
}

/**
 * Accept a pending invitation. Uses the custom
 * `/api/orgs/invitations/[id]/accept` route (same emailVerified constraint
 * as above); passing `setActive: true` makes the server switch the caller's
 * active organization in the same request, so no follow-up
 * `authClient.organization.setActive` call is needed — just invalidate and
 * let the caller `router.refresh()`.
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invitationId,
      setActive,
    }: {
      invitationId: string
      setActive?: boolean
    }) =>
      fetchJson(`/api/orgs/invitations/${invitationId}/accept`, {
        method: "POST",
        body: JSON.stringify({ setActive: Boolean(setActive) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingInvitationsKey })
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
    },
  })
}

export function useRejectInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) =>
      fetchJson(`/api/orgs/invitations/${invitationId}/reject`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingInvitationsKey })
    },
  })
}
