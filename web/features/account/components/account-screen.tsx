"use client"

import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/shared/utils"

import { useAccountActions } from "../hooks/use-account-actions"
import { AgentInstallationsPanel } from "./agent-installations-panel"
import { InstallIntentPreview } from "./install-intent-preview"
import { ProfilePanel } from "./profile-panel"
import { SignInPanel } from "./sign-in-panel"

export function AccountScreen() {
  const searchParams = useSearchParams()
  const pendingInstallSlug =
    searchParams.get("intent") === "install" ? searchParams.get("slug") : null
  const {
    error,
    isPending,
    pendingProvider,
    session,
    signInGithub,
    signInGoogle,
    signInNear,
    signOut,
  } = useAccountActions()

  return (
    <main
      className={cn(
        "mx-auto min-h-[calc(100svh-4rem)] max-w-7xl px-4 py-10 sm:px-6 lg:px-8",
        !isPending && session === null && "grid place-items-center"
      )}
    >
      {isPending ? (
        <div className="grid min-h-[32rem] place-items-center">
          <p className="text-sm text-muted-foreground">Loading account...</p>
        </div>
      ) : session ? (
        <div className="flex w-full flex-col gap-4">
          <ProfilePanel session={session} onSignOut={signOut}>
            <AgentInstallationsPanel isActive={Boolean(session)} />
          </ProfilePanel>
          <InstallIntentPreview slug={pendingInstallSlug ?? "clickup"} />
        </div>
      ) : (
        <SignInPanel
          error={error}
          pendingProvider={pendingProvider}
          onGithub={signInGithub}
          onGoogle={signInGoogle}
          onNear={signInNear}
        />
      )}
    </main>
  )
}
