"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/features/shell/components/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { authClient } from "@/lib/auth/client"
import {
  type OrgRole,
  useOrgMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/features/partner/api/orgs"
import {
  useCancelInvitation,
  useCreateInvitation,
  useOrgInvitations,
} from "@/features/partner/api/invitations"
import { useToast } from "@/features/partner/store/toast-provider"
import {
  IconUsers,
  IconMail,
  IconUserPlus,
  IconTrash,
  IconClock,
  IconX,
} from "@tabler/icons-react"

export default function TeamPage() {
  const { data: session } = authClient.useSession()
  const organizationId = session?.session.activeOrganizationId ?? undefined
  const currentUserId = session?.user.id

  const { data: members, isLoading: membersLoading } = useOrgMembers(organizationId)
  const { data: invitations, isLoading: invitationsLoading } = useOrgInvitations(organizationId)
  const createInvitation = useCreateInvitation(organizationId ?? "")
  const cancelInvitation = useCancelInvitation(organizationId ?? "")
  const updateRole = useUpdateMemberRole(organizationId ?? "")
  const removeMember = useRemoveMember(organizationId ?? "")
  const { notify } = useToast()

  const currentMember = members?.find((m) => m.userId === currentUserId)
  const currentRole: OrgRole | undefined = currentMember?.role
  const canManageMembers = currentRole === "owner" || currentRole === "admin"
  const canChangeRoles = currentRole === "owner"

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrgRole>("member")

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !organizationId) return
    try {
      await createInvitation.mutateAsync({ email: inviteEmail, role: inviteRole })
      setInviteEmail("")
      setInviteRole("member")
      notify(`Sent invitation to ${inviteEmail}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to send invitation", "error")
    }
  }

  const handleRemoveMember = async (memberId: string, label: string) => {
    try {
      await removeMember.mutateAsync(memberId)
      notify(`Removed member ${label}`, "info")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to remove member", "error")
    }
  }

  const handleRoleChange = async (memberId: string, role: OrgRole) => {
    try {
      await updateRole.mutateAsync({ memberId, role })
      notify("Role updated")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to update role", "error")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId)
      notify("Invitation canceled", "info")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to cancel invitation", "error")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Organization"
        title="Members & Access"
        description="Invite coworkers, manage system roles, and review pending invitations."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Invite / rules column */}
        <div className="flex flex-col gap-6 md:col-span-1">
          {canManageMembers && (
            <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <IconUserPlus className="size-4 text-primary" />
                Invite Member
              </h3>

              <form onSubmit={handleInviteSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Email Address
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="e.g. cameron@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="rounded-full bg-background/50 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Access Role
                  </label>
                  <NativeSelect
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                    className="w-full rounded-full text-sm"
                  >
                    <NativeSelectOption value="member">Member (Read & Install)</NativeSelectOption>
                    <NativeSelectOption value="admin">Admin (Full Control)</NativeSelectOption>
                  </NativeSelect>
                </div>

                <Button
                  type="submit"
                  disabled={createInvitation.isPending}
                  className="w-full rounded-full text-xs mt-2"
                >
                  Send Invitation
                </Button>
              </form>
            </Card>
          )}

          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
              <IconClock className="size-4 text-primary" />
              Pending Invitations
            </h3>

            {invitationsLoading && (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}

            <div className="flex flex-col gap-2">
              {invitations
                ?.filter((invite) => invite.status === "pending")
                .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--ironhub-line)]/30 bg-background/30 p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{invite.email}</p>
                      <p className="text-muted-foreground">{invite.role || "member"}</p>
                    </div>
                    {canManageMembers && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelInvitation(invite.id)}
                        className="h-7 w-7 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Cancel invitation for ${invite.email}`}
                      >
                        <IconX className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              {!invitationsLoading && (invitations?.filter((i) => i.status === "pending").length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">No pending invitations.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Members column */}
        <div className="flex flex-col gap-6 md:col-span-2">
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <IconUsers className="size-4 text-primary" />
              Space Members ({members?.length ?? 0})
            </h3>

            {membersLoading && <p className="text-xs text-muted-foreground">Loading members...</p>}

            <div className="flex flex-col gap-3">
              {members?.map((member) => {
                const label = member.user?.name || member.user?.email || member.userId
                const isSelf = member.userId === currentUserId
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--ironhub-line)]/30 bg-background/30 p-3 hover:bg-muted/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase shrink-0">
                        {label.slice(0, 2)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">{label}</span>
                        {member.user?.email && (
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                            <IconMail className="size-3" />
                            {member.user.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canChangeRoles && !isSelf ? (
                        <NativeSelect
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                          className="h-7 rounded-full text-xs"
                        >
                          <NativeSelectOption value="member">member</NativeSelectOption>
                          <NativeSelectOption value="admin">admin</NativeSelectOption>
                          <NativeSelectOption value="owner">owner</NativeSelectOption>
                        </NativeSelect>
                      ) : (
                        <Badge variant="outline" className="font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded-full">
                          {member.role}
                        </Badge>
                      )}

                      {canManageMembers && !isSelf && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id, label)}
                          className="h-7 w-7 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Remove ${label}`}
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
