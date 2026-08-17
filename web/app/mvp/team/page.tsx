"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { authClient } from "@/lib/auth/client"
import {
  type OrgRole,
  type OrgMember,
  useOrgMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/features/partner/api/orgs"
import {
  type OrgInvitation,
  useCancelInvitation,
  useCreateInvitation,
  useOrgInvitations,
} from "@/features/partner/api/invitations"
import { useToast } from "@/features/partner/store/toast-provider"
import {
  WorkspacePageHeader,
  DataTable,
  type DataTableColumn,
  EmptyState,
  AttributeBadge,
  RelativeTime,
} from "@/features/partner/components/ui"
import {
  IconAlertTriangle,
  IconUsers,
  IconUserPlus,
  IconTrash,
  IconClock,
  IconX,
  IconLoader2,
  IconInfoCircle,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function TeamPage() {
  const { data: session } = authClient.useSession()
  const organizationId = session?.session.activeOrganizationId ?? undefined
  const currentUserId = session?.user.id

  const { data: members, isLoading: membersLoading, isError: membersError } = useOrgMembers(organizationId)
  const {
    data: invitations,
    isLoading: invitationsLoading,
    isError: invitationsError,
  } = useOrgInvitations(organizationId)
  const createInvitation = useCreateInvitation(organizationId ?? "")
  const cancelInvitation = useCancelInvitation(organizationId ?? "")
  const updateRole = useUpdateMemberRole(organizationId ?? "")
  const removeMember = useRemoveMember(organizationId ?? "")
  const { notify } = useToast()

  const currentMember = members?.find((m) => m.userId === currentUserId)
  const currentRole: OrgRole | undefined = currentMember?.role
  const canManageMembers = currentRole === "owner" || currentRole === "admin"
  const canChangeRoles = currentRole === "owner"

  // Invite dialog & form state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrgRole>("member")

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !organizationId) return
    try {
      await createInvitation.mutateAsync({ email: inviteEmail, role: inviteRole })
      setInviteEmail("")
      setInviteRole("member")
      setInviteDialogOpen(false)
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

  const memberColumns: DataTableColumn<OrgMember>[] = [
    {
      key: "member",
      header: "Member",
      wrap: true,
      cell: (member) => {
        const label = member.user?.name || member.user?.email || member.userId
        const email = member.user?.email
        const initials = label.slice(0, 2).toUpperCase()
        return (
          <div className="flex items-center gap-3 min-w-0 py-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-sm text-foreground">{label}</p>
              {email && (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => {
        const label = member.user?.name || member.user?.email || member.userId
        const isSelf = member.userId === currentUserId
        const canEditThisRow = canChangeRoles && !isSelf
        const roleDisplay = member.role.charAt(0).toUpperCase() + member.role.slice(1)
        if (canEditThisRow) {
          return (
            <NativeSelect
              aria-label={`Role for ${label}`}
              value={member.role}
              onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
              className="w-32"
              selectClassName="h-10 rounded-lg text-sm"
            >
              <NativeSelectOption value="member">Member</NativeSelectOption>
              <NativeSelectOption value="admin">Admin</NativeSelectOption>
              <NativeSelectOption value="owner">Owner</NativeSelectOption>
            </NativeSelect>
          )
        }
        return <AttributeBadge>{roleDisplay}</AttributeBadge>
      },
    },
    {
      key: "joined",
      header: "Joined",
      cell: (member) => (
        <RelativeTime value={member.createdAt} className="text-sm text-muted-foreground" />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      srOnlyHeader: true,
      align: "right",
      cell: (member) => {
        const label = member.user?.name || member.user?.email || member.userId
        const isSelf = member.userId === currentUserId
        const isOwnerRow = member.role === "owner"
        const canRemoveThisRow = canManageMembers && !isSelf && (!isOwnerRow || canChangeRoles)
        if (!canRemoveThisRow) return null
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex items-center justify-center"
                aria-label={`Remove ${label}`}
              >
                <IconTrash className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle>Remove {label}?</DialogTitle>
                <DialogDescription>
                  They will immediately lose access to this workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-11 rounded-lg sm:h-10">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleRemoveMember(member.id, label)}
                    className="h-11 rounded-lg sm:h-10"
                  >
                    <IconTrash className="size-4 mr-1.5" />
                    Remove
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        )
      },
    },
  ]

  const pendingInvitations = invitations?.filter((invite) => invite.status === "pending") ?? []

  const invitationColumns: DataTableColumn<OrgInvitation>[] = [
    {
      key: "email",
      header: "Email",
      wrap: true,
      cell: (invite) => (
        <span className="font-medium text-sm text-foreground">{invite.email}</span>
      ),
    },
    {
      key: "access",
      header: "Access",
      cell: (invite) => {
        const roleStr = invite.role || "member"
        return (
          <AttributeBadge>
            {roleStr.charAt(0).toUpperCase() + roleStr.slice(1)}
          </AttributeBadge>
        )
      },
    },
    {
      key: "expires",
      header: "Expires",
      cell: (invite) => (
        <RelativeTime value={invite.expiresAt} className="text-sm text-muted-foreground" />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      srOnlyHeader: true,
      align: "right",
      cell: (invite) => {
        if (!canManageMembers) return null
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleCancelInvitation(invite.id)}
            className="size-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex items-center justify-center"
            aria-label={`Cancel invitation for ${invite.email}`}
          >
            <IconX className="size-4" />
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-8">
      <WorkspacePageHeader
        title="Members"
        description="Invite people to this workspace and choose what they can do."
        action={
          canManageMembers ? (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-lg px-4 sm:h-10">
                  <IconUserPlus className="size-4 mr-2" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-xl">
                <DialogHeader>
                  <DialogTitle>Invite someone</DialogTitle>
                  <DialogDescription>
                    They will get an email with a link to join this workspace.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
                      Email address
                    </label>
                    <Input
                      id="invite-email"
                      required
                      type="email"
                      placeholder="name@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-11 rounded-lg sm:h-10"
                    />
                    <p className="text-sm text-muted-foreground">
                      Where the invitation is sent.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                      What they can do
                    </label>
                    <NativeSelect
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                      className="w-full"
                      selectClassName="h-11 rounded-lg sm:h-10 text-sm"
                    >
                      <NativeSelectOption value="member">
                        Member — can view and install
                      </NativeSelectOption>
                      <NativeSelectOption value="admin">
                        Admin — can manage members and items
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                      className="h-11 rounded-lg sm:h-10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createInvitation.isPending}
                      className="h-11 rounded-lg sm:h-10"
                    >
                      {createInvitation.isPending && (
                        <IconLoader2 className="size-4 animate-spin mr-1.5" />
                      )}
                      Send invitation
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div>
        <div className="mb-3">
          <h2 className="text-base font-medium text-foreground">
            People with access ({members?.length ?? 0})
          </h2>
          <p className="text-sm text-muted-foreground">
            Everyone who can open this workspace, and what they are allowed to do.
          </p>
        </div>

        {membersError && (members?.length ?? 0) > 0 && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
            <IconInfoCircle className="size-5 shrink-0 mt-0.5" />
            <span>Could not refresh the members list. You are seeing the last version that loaded.</span>
          </div>
        )}

        <DataTable
          columns={memberColumns}
          rows={members ?? []}
          rowKey={(m) => m.id}
          caption="Workspace members"
          minWidth="30rem"
          empty={
            membersLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Loading members...</span>
              </div>
            ) : membersError ? (
              <EmptyState
                variant="bare"
                icon={IconAlertTriangle}
                title="Could not load members"
                description="Could not fetch the members list."
              />
            ) : (
              <EmptyState
                variant="bare"
                icon={IconUsers}
                title="No members found"
                description="This workspace has no members."
              />
            )
          }
        />
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-base font-medium text-foreground">Pending invitations</h2>
          <p className="text-sm text-muted-foreground">
            Invitations you send appear here until they are accepted.
          </p>
        </div>

        {invitationsError && pendingInvitations.length > 0 && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
            <IconInfoCircle className="size-5 shrink-0 mt-0.5" />
            <span>Could not refresh the invitations list. You are seeing the last version that loaded.</span>
          </div>
        )}

        <DataTable
          columns={invitationColumns}
          rows={pendingInvitations}
          rowKey={(i) => i.id}
          caption="Pending invitations"
          minWidth="30rem"
          empty={
            invitationsLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Loading invitations...</span>
              </div>
            ) : invitationsError ? (
              <EmptyState
                variant="bare"
                icon={IconAlertTriangle}
                title="Could not load invitations"
                description="Could not fetch pending invitations."
              />
            ) : (
              <EmptyState
                variant="bare"
                icon={IconClock}
                title="No pending invitations"
              />
            )
          }
        />
      </div>
    </div>
  )
}
