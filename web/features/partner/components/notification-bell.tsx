"use client"

import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconX,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  useAcceptInvitation,
  usePendingInvitations,
  useRejectInvitation,
} from "@/features/partner/api/invitations"
import { useToast } from "@/features/partner/store/toast-provider"

export function NotificationBell() {
  const { data: invitations, isError } = usePendingInvitations()
  const acceptInvitation = useAcceptInvitation()
  const rejectInvitation = useRejectInvitation()
  const { notify } = useToast()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingCount = invitations?.length ?? 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAccept = async (invitationId: string) => {
    try {
      // setActive: true makes the server switch the caller's active org in
      // the same request (server-side, so the session cookie is refreshed
      // correctly) — no client-side authClient.organization.setActive call
      // needed here.
      await acceptInvitation.mutateAsync({ invitationId, setActive: true })
      notify("Invitation accepted")
      router.refresh()
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to accept invitation",
        "error"
      )
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      await rejectInvitation.mutateAsync(invitationId)
      notify("Invitation declined", "info")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to decline invitation",
        "error"
      )
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative size-10 rounded-lg"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <IconBell className="size-4" aria-hidden="true" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-xs leading-none font-bold text-primary-foreground">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </Button>

      {open && (
        // On phones the bell is not the last control in the header, so a panel
        // anchored to it would hang off the left edge — it spans the header
        // width instead. From `sm` up there is room to hang it off the bell.
        <div className="fixed top-[4.5rem] right-4 left-4 z-50 rounded-xl border border-[var(--ironhub-line)] bg-popover p-2 shadow-lg sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-2rem)]">
          <p className="px-2 pt-1 pb-1 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Pending invitations
          </p>
          <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {isError && (
              <p className="flex items-center gap-1.5 px-2 py-3 text-xs font-semibold text-destructive">
                <IconAlertTriangle
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                Failed to load invitations.
              </p>
            )}
            {!isError &&
              invitations?.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-lg border border-[var(--ironhub-line)]/40 bg-muted/20 p-2.5"
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
                      className="h-10 flex-1 rounded-lg text-sm"
                      onClick={() => handleAccept(invite.id)}
                    >
                      <IconCheck className="size-4" aria-hidden="true" />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 flex-1 rounded-lg text-sm"
                      onClick={() => handleReject(invite.id)}
                    >
                      <IconX className="size-4" aria-hidden="true" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            {!isError && pendingCount === 0 && (
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
