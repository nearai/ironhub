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
  workspaceLinkTone,
} from "@/features/partner/components/ui"
import { formatAccountIdentity } from "@/lib/orgs/near-identity"
import { cn } from "@/lib/shared/utils"
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

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
  } = useOrgMembers(organizationId)
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
  const [inviteIdentifier, setInviteIdentifier] = useState("")
  const [inviteRole, setInviteRole] = useState<OrgRole>("member")

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const identifier = inviteIdentifier.trim()
    if (!identifier || !organizationId) return
    try {
      await createInvitation.mutateAsync({ identifier, role: inviteRole })
      setInviteIdentifier("")
      setInviteRole("member")
      setInviteDialogOpen(false)
      notify(`Invited ${identifier}`)
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to send invitation",
        "error"
      )
    }
  }

  const handleRemoveMember = async (memberId: string, label: string) => {
    try {
      await removeMember.mutateAsync(memberId)
      notify(`Removed member ${label}`, "info")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to remove member",
        "error"
      )
    }
  }

  const handleRoleChange = async (memberId: string, role: OrgRole) => {
    try {
      await updateRole.mutateAsync({ memberId, role })
      notify("Role updated")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to update role",
        "error"
      )
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId)
      notify("Invitation canceled", "info")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to cancel invitation",
        "error"
      )
    }
  }

  const memberColumns: DataTableColumn<OrgMember>[] = [
    {
      key: "member",
      header: "Member",
      wrap: true,
      cell: (member) => {
        const label = member.user?.name || member.user?.email || member.userId
        // A wallet user's name and derived address render as the same string
        // (both "alice.near"), so only show the second line when it adds
        // something.
        const identity = member.user?.email
          ? formatAccountIdentity(member.user.email)
          : undefined
        const initials = label.slice(0, 2).toUpperCase()
        return (
          <div className="flex min-w-0 items-center gap-3 py-1">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase",
                workspaceLinkTone
              )}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {label}
              </p>
              {identity && identity !== label && (
                <p className="truncate text-sm text-muted-foreground">
                  {identity}
                </p>
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
        const roleDisplay =
          member.role.charAt(0).toUpperCase() + member.role.slice(1)
        if (canEditThisRow) {
          return (
            <NativeSelect
              aria-label={`Role for ${label}`}
              value={member.role}
              onChange={(e) =>
                handleRoleChange(member.id, e.target.value as OrgRole)
              }
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
        <RelativeTime
          value={member.createdAt}
          className="text-sm text-muted-foreground"
        />
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
        const canRemoveThisRow =
          canManageMembers && !isSelf && (!isOwnerRow || canChangeRoles)
        if (!canRemoveThisRow) return null
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-lg sm:h-10"
                  >
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
                    <IconTrash className="mr-1.5 size-4" />
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

  const pendingInvitations =
    invitations?.filter((invite) => invite.status === "pending") ?? []

  const invitationColumns: DataTableColumn<OrgInvitation>[] = [
    {
      key: "invited",
      header: "Invited",
      wrap: true,
      cell: (invite) => (
        <span className="text-sm font-medium text-foreground">
          {formatAccountIdentity(invite.email)}
        </span>
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
        <RelativeTime
          value={invite.expiresAt}
          className="text-sm text-muted-foreground"
        />
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
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Cancel invitation for ${formatAccountIdentity(invite.email)}`}
          >
            <IconX className="size-4" />
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Members"
        description="Invite people to this workspace and choose what they can do."
        action={
          canManageMembers ? (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-lg px-4 sm:h-10">
                  <IconUserPlus className="mr-2 size-4" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-xl">
                <DialogHeader>
                  <DialogTitle>Invite someone</DialogTitle>
                  <DialogDescription>
                    No email is sent. The invitation waits in their
                    notifications until they accept it.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="invite-identifier"
                      className="text-sm font-medium text-foreground"
                    >
                      Email or NEAR account
                    </label>
                    <Input
                      id="invite-identifier"
                      required
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="name@example.com or alice.near"
                      value={inviteIdentifier}
                      onChange={(e) => setInviteIdentifier(e.target.value)}
                      className="h-11 rounded-lg sm:h-10"
                    />
                    <p className="text-sm text-muted-foreground">
                      Use whichever they sign in with. A NEAR account that has
                      never signed in here can only be invited once it has.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="invite-role"
                      className="text-sm font-medium text-foreground"
                    >
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

                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
                        <IconLoader2 className="mr-1.5 size-4 animate-spin" />
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
            Everyone who can open this workspace, and what they are allowed to
            do.
          </p>
        </div>

        {membersError && (members?.length ?? 0) > 0 && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
            <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
            <span>
              Could not refresh the members list. You are seeing the last
              version that loaded.
            </span>
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
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
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
          <h2 className="text-base font-medium text-foreground">
            Pending invitations
          </h2>
          <p className="text-sm text-muted-foreground">
            Invitations you send appear here until they are accepted.
          </p>
        </div>

        {invitationsError && pendingInvitations.length > 0 && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
            <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
            <span>
              Could not refresh the invitations list. You are seeing the last
              version that loaded.
            </span>
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
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
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
                description="Anyone you invite will be listed here until they accept."
              />
            )
          }
        />
      </div>
    </div>
  )
}
