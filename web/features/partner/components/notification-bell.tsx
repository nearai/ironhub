"use client"

import { IconBell, IconCheck, IconX } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  useAcceptInvitation,
  usePendingInvitations,
  useRejectInvitation,
} from "@/features/partner/api/invitations"
import { useSetActiveOrganization } from "@/features/partner/api/orgs"
import { useToast } from "@/features/partner/store/toast-provider"

export function NotificationBell() {
  const { data: invitations } = usePendingInvitations()
  const acceptInvitation = useAcceptInvitation()
  const rejectInvitation = useRejectInvitation()
  const setActive = useSetActiveOrganization()
  const { notify } = useToast()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingCount = invitations?.length ?? 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAccept = async (invitationId: string, organizationId: string) => {
    try {
      await acceptInvitation.mutateAsync(invitationId)
      notify("Invitation accepted")
      try {
        await setActive.mutateAsync(organizationId)
        router.refresh()
      } catch {
        // switching active org is best-effort here
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to accept invitation", "error")
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      await rejectInvitation.mutateAsync(invitationId)
      notify("Invitation declined", "info")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to decline invitation", "error")
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative rounded-full"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <IconBell className="size-4" />
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-[var(--ironhub-line)] bg-popover p-2 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Pending invitations
          </p>
          <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {invitations?.map((invite) => (
              <div
                key={invite.id}
                className="rounded-xl border border-[var(--ironhub-line)]/40 bg-background/40 p-2.5"
              >
                <p className="text-xs font-semibold text-foreground">
                  {invite.organizationName || invite.organizationId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Role: {invite.role || "member"}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 flex-1 rounded-full text-xs"
                    onClick={() => handleAccept(invite.id, invite.organizationId)}
                  >
                    <IconCheck className="size-3" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 rounded-full text-xs"
                    onClick={() => handleReject(invite.id)}
                  >
                    <IconX className="size-3" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
            {pendingCount === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No pending invitations.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
