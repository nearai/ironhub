"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth/client"
import type { OrgRole } from "./orgs"

export interface OrgInvitation {
  id: string
  organizationId: string
  organizationName?: string
  email: string
  role: OrgRole | null
  status: string
  expiresAt: string
}

const orgInvitationsKey = (organizationId: string) =>
  ["organizations", organizationId, "invitations"] as const
const pendingInvitationsKey = ["invitations", "pending"] as const

function unwrap<T>(result: { data: T | null; error: { message?: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message || "Invitation request failed.")
  }
  if (result.data === null) {
    throw new Error("Invitation request returned no data.")
  }
  return result.data
}

/** Invitations created by/for this organization (owner/admin view). */
export function useOrgInvitations(organizationId: string | undefined) {
  return useQuery({
    queryKey: organizationId
      ? orgInvitationsKey(organizationId)
      : ["organizations", "unknown", "invitations"],
    queryFn: async () => {
      const result = await authClient.organization.listInvitations({
        query: { organizationId },
      })
      return unwrap(result) as unknown as OrgInvitation[]
    },
    enabled: Boolean(organizationId),
  })
}

export function useCreateInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: OrgRole }) => {
      const result = await authClient.organization.inviteMember({
        organizationId,
        email,
        role,
      })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgInvitationsKey(organizationId) })
    },
  })
}

export function useCancelInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({ invitationId })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgInvitationsKey(organizationId) })
    },
  })
}

/** Invitations pending for the signed-in user, across all orgs (by email). */
export function usePendingInvitations() {
  return useQuery({
    queryKey: pendingInvitationsKey,
    queryFn: async () => {
      const result = await authClient.organization.listUserInvitations()
      return unwrap(result) as unknown as OrgInvitation[]
    },
    refetchInterval: 60_000,
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.acceptInvitation({ invitationId })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingInvitationsKey })
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
    },
  })
}

export function useRejectInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.rejectInvitation({ invitationId })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingInvitationsKey })
    },
  })
}
