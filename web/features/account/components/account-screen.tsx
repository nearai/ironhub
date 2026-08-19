"use client"

import { useSearchParams } from "next/navigation"

import { isAgentInstallEnabled } from "@/lib/shared/feature-flags"
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
    detectedNearAccount,
    error,
    isSigningOut,
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
          <ProfilePanel
            error={error}
            isSigningOut={isSigningOut}
            session={session}
            onSignOut={signOut}
          >
            <AgentInstallationsPanel isActive={Boolean(session)} />
          </ProfilePanel>
          {/* Documentation for the install flow, so it hides with it. Its
              contents are entirely synthetic -- a fabricated HMAC payload and
              a redirect URL pointing at someone else's agent -- which reads as
              a working feature the user got wrong when the flow is off. */}
          {isAgentInstallEnabled ? (
            <InstallIntentPreview slug={pendingInstallSlug ?? "clickup"} />
          ) : null}
        </div>
      ) : (
        <SignInPanel
          detectedNearAccount={detectedNearAccount}
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
