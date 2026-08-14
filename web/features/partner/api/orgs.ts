"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth/client"
import { fetchJson } from "./client"

export type OrgRole = "owner" | "admin" | "member"

export interface MyOrganization {
  id: string
  name: string
  slug: string
  role: OrgRole
}

export interface OrgMember {
  id: string
  userId: string
  role: OrgRole
  createdAt: string
  user?: { name?: string | null; email?: string | null }
}

const organizationsKey = ["organizations"] as const
const membersKey = (organizationId: string) => ["organizations", organizationId, "members"] as const

function unwrap<T>(result: { data: T | null; error: { message?: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message || "Organization request failed.")
  }
  if (result.data === null) {
    throw new Error("Organization request returned no data.")
  }
  return result.data
}

/**
 * List organizations the current user belongs to, with their role in each.
 *
 * Uses the custom `/api/orgs` route (not `authClient.organization.list`):
 * BetterAuth's org endpoints hard-403 users with `emailVerified=false`,
 * which is every NEAR-wallet user in this app, and the plain list endpoint
 * doesn't return the caller's role anyway.
 */
export function useMyOrganizations() {
  return useQuery({
    queryKey: organizationsKey,
    queryFn: () =>
      fetchJson<{ organizations: MyOrganization[] }>("/api/orgs").then(
        (data) => data.organizations
      ),
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const base =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "org"
      const suffix = Math.random().toString(36).slice(2, 8)
      const slug = `${base}-${suffix}`
      const result = await authClient.organization.create({ name, slug })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationsKey })
    },
  })
}

export function useSetActiveOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await authClient.organization.setActive({ organizationId })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

export function useLeaveOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await authClient.organization.leave({ organizationId })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationsKey })
    },
  })
}

export function useRenameOrganization(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await authClient.organization.update({
        organizationId,
        data: { name },
      })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationsKey })
    },
  })
}

export function useOrgMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: organizationId ? membersKey(organizationId) : ["organizations", "unknown", "members"],
    queryFn: async () => {
      const result = await authClient.organization.listMembers({
        query: { organizationId },
      })
      const data = unwrap(result) as unknown as { members: OrgMember[] }
      return data.members
    },
    enabled: Boolean(organizationId),
  })
}

export function useUpdateMemberRole(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: OrgRole }) => {
      const result = await authClient.organization.updateMemberRole({
        organizationId,
        memberId,
        role,
      })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(organizationId) })
    },
  })
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const result = await authClient.organization.removeMember({
        organizationId,
        memberIdOrEmail,
      })
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(organizationId) })
    },
  })
}
