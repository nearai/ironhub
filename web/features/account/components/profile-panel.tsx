"use client"

import { IconLoader2, IconLogout } from "@tabler/icons-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { AuthSession } from "@/lib/auth/server"
import { UserClawAvatar } from "./user-claw-avatar"

type ProfilePanelProps = {
  children: ReactNode
  error: string | null
  isSigningOut: boolean
  session: AuthSession
  onSignOut: () => Promise<void>
}

export function ProfilePanel({
  children,
  error,
  isSigningOut,
  session,
  onSignOut,
}: ProfilePanelProps) {
  const { user } = session

  return (
    <section className="grid grid-cols-1 gap-7 rounded-xl border border-[var(--ironhub-line)] bg-card/86 p-6 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <UserClawAvatar
            user={user}
            size={72}
            className="size-18"
            imageClassName="origin-top scale-[2] object-cover object-top p-0"
          />
          <div className="min-w-0">
            {/* Account ids (including 64-char implicit NEAR accounts) must
                stay fully readable -- wrap instead of ellipsising, and use
                [overflow-wrap:anywhere] since the id has no natural break
                points for the browser to wrap on. */}
            <h2 className="font-heading text-2xl font-semibold break-words [overflow-wrap:anywhere]">
              {user.name}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {user.email.includes("near") ? null : user.email}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isSigningOut}
          onClick={onSignOut}
          className="h-10 justify-self-start rounded-full border-[var(--ironhub-line)] bg-background/45 px-4 sm:justify-self-auto"
        >
          {isSigningOut ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconLogout className="size-4" />
          )}
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="border-t border-[var(--ironhub-line)] pt-6">
        {children}
      </div>
    </section>
  )
}
