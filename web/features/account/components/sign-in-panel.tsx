"use client"

import { useState } from "react"
import {
  IconBrandGithub,
  IconBrandGoogleFilled,
  IconLock,
  IconLoader2,
  IconWallet,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

import { SignInOptionButton } from "./sign-in-option-button"

type DetectedNearAccount = {
  accountId: string
  publicKey: string | null
  networkId: string
}

type SignInPanelProps = {
  detectedNearAccount: DetectedNearAccount | null | undefined
  error: string | null
  pendingProvider: "google" | "github" | "near" | null
  onGithub: () => void
  onGoogle: () => void
  onNear: () => void
}

function DetectingSpinner() {
  return (
    <section className="mx-auto w-full max-w-[28rem] rounded-2xl border border-[var(--ironhub-line)] bg-card/88 p-5 shadow-[0_28px_90px_rgb(43_130_212_/_0.18)] backdrop-blur-xl sm:p-6">
      <div className="grid gap-3 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_12px_34px_rgb(43_130_212_/_0.16)]">
          <IconLock className="size-6" />
        </span>
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-normal text-foreground">
            Sign in to IronHub
          </h1>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <IconLoader2 className="size-3.5 animate-spin" />
            Detecting wallet...
          </p>
        </div>
      </div>
    </section>
  )
}

export function SignInPanel({
  detectedNearAccount,
  error,
  pendingProvider,
  onGithub,
  onGoogle,
  onNear,
}: SignInPanelProps) {
  const [showAllOptions, setShowAllOptions] = useState(false)
  const isPending = pendingProvider !== null

  if (detectedNearAccount === undefined) {
    return <DetectingSpinner />
  }

  const showOptions = detectedNearAccount === null || showAllOptions

  return (
    <section className="mx-auto w-full max-w-[28rem] rounded-2xl border border-[var(--ironhub-line)] bg-card/88 p-5 shadow-[0_28px_90px_rgb(43_130_212_/_0.18)] backdrop-blur-xl sm:p-6">
      <div className="mb-6 grid gap-3 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_12px_34px_rgb(43_130_212_/_0.16)]">
          <IconLock className="size-6" />
        </span>
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-normal text-foreground">
            Sign in to IronHub
          </h1>
          {detectedNearAccount && !showOptions ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Wallet detected — continue with your NEAR account.
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Manage agents, installs, and account settings from one place.
            </p>
          )}
        </div>
      </div>

      {showOptions ? (
        <div className="grid gap-3">
          <SignInOptionButton
            Icon={IconBrandGoogleFilled}
            disabled={isPending}
            isPending={pendingProvider === "google"}
            label="Google"
            onClick={onGoogle}
          />
          <SignInOptionButton
            Icon={IconBrandGithub}
            disabled={isPending}
            isPending={pendingProvider === "github"}
            label="GitHub"
            onClick={onGithub}
          />
          <SignInOptionButton
            Icon={IconWallet}
            disabled={isPending}
            isPending={pendingProvider === "near"}
            label="NEAR"
            onClick={onNear}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          <Button
            size="lg"
            disabled={isPending}
            onClick={onNear}
            className="h-14 justify-center rounded-xl bg-primary/90 text-base font-medium text-primary-foreground shadow-[0_12px_34px_rgb(43_130_212_/_0.18)] hover:bg-primary"
          >
            <IconWallet className="mr-2.5 size-5" />
            Continue as {detectedNearAccount?.accountId}
          </Button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowAllOptions(true)}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Use another account
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
