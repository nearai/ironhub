"use client"

import { IconLogout } from "@tabler/icons-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { AuthSession } from "@/lib/auth/server"
import { UserClawAvatar } from "./user-claw-avatar"

type ProfilePanelProps = {
  children: ReactNode
  session: AuthSession
  onSignOut: () => void
}

export function ProfilePanel({
  children,
  session,
  onSignOut,
}: ProfilePanelProps) {
  const { user } = session

  return (
    <section className="grid gap-7 rounded-xl border border-[var(--ironhub-line)] bg-card/86 p-6 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <UserClawAvatar
            user={user}
            size={72}
            className="size-18"
            imageClassName="origin-top scale-[2] object-cover object-top p-0"
          />
          <div className="min-w-0">
            <h2 className="truncate font-heading text-2xl font-semibold">
              {user.name}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {user.email.includes("near") ? null : user.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onSignOut}
          className="h-10 justify-self-start rounded-full border-[var(--ironhub-line)] bg-background/45 px-4 sm:justify-self-auto"
        >
          <IconLogout className="size-4" />
          Sign out
        </Button>
      </div>

      <div className="border-t border-[var(--ironhub-line)] pt-6">
        {children}
      </div>
    </section>
  )
}
