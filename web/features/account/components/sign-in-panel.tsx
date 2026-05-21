"use client"

import {
  IconBrandGithub,
  IconBrandGoogleFilled,
  IconLock,
  IconWallet,
} from "@tabler/icons-react"

import { SignInOptionButton } from "./sign-in-option-button"

type SignInPanelProps = {
  error: string | null
  pendingProvider: "google" | "github" | "near" | null
  onGithub: () => void
  onGoogle: () => void
  onNear: () => void
}

export function SignInPanel({
  error,
  pendingProvider,
  onGithub,
  onGoogle,
  onNear,
}: SignInPanelProps) {
  const isPending = pendingProvider !== null

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
          <p className="text-sm leading-6 text-muted-foreground">
            Manage agents, installs, and account settings from one place.
          </p>
        </div>
      </div>

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

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
