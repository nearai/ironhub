"use client"

import { IconClock, IconExternalLink } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  INSTALL_WINDOW_SECONDS,
  useInstallIntent,
} from "@/features/account/hooks/use-install-intent"
import { SoulInstallDisclosure } from "@/features/partner/components/soul-install-disclosure"
import { describeInstallWindow } from "@/lib/agent-installations/install-timing"
import type { InstallSource } from "@/lib/agent-installations/types"
import { isAgentInstallEnabled } from "@/lib/shared/feature-flags"

type SecureInstallButtonProps = {
  slug: string
  /**
   * Which catalog `slug` names. Stated by the call site because the screen
   * knows -- a marketplace detail page is on the public catalog, a workspace
   * screen is on its organization's private one -- and because the hub no
   * longer guesses: a name can exist in both, and guessing installed the
   * wrong one without saying so.
   */
  source: InstallSource
} & (
  | {
      /** The kind the call site believes `slug` is, asserted during
       *  resolution. */
      type: "tool" | "skill"
      artifactId?: undefined
    }
  | {
      /**
       * A soul's install is disclosed before it is confirmed, and the
       * disclosure needs the artifact to read the document from. Required by
       * the type rather than checked at runtime so a call site cannot start a
       * soul install with nothing shown -- which is the one failure mode the
       * disclosure exists to prevent (design.md -- "Full-text disclosure
       * before install").
       */
      type: "soul"
      artifactId: string
    }
)

/**
 * The install surface, and the only place the click-through deadline exists
 * for the user.
 *
 * There are two clocks on an install and this component shows exactly one of
 * them (see lib/agent-installations/install-timing.ts). The click-through
 * window is the one the user can miss: the agent refuses a delivery older than
 * it, and until this component existed a user who took too long saw an agent
 * error about a timestamp with no hint that a deadline had ever been stated.
 * The artifact-token window is deliberately absent -- the user takes no action
 * during it, and a second number would obscure the one that matters.
 */
export function SecureInstallButton(props: SecureInstallButtonProps) {
  // The agent has no surface that consumes the install deep link this button
  // produces (see the module comment on isAgentInstallEnabled), so showing it
  // would silently do nothing for the user. Gated here, not at the call sites,
  // so every current and future call site is covered by one switch.
  //
  // Split into a wrapper rather than returning null inside the body: this way
  // the disabled case mounts no hooks at all, instead of running the intent
  // hook's state and effect for something that renders nothing. The wrapper
  // itself calls no hooks, so the early return is not a hook-order hazard.
  if (!isAgentInstallEnabled) {
    return null
  }

  if (props.type === "soul") {
    return (
      <SoulInstallDisclosure artifactId={props.artifactId}>
        <SecureInstallButtonContent {...props} />
      </SoulInstallDisclosure>
    )
  }

  return <SecureInstallButtonContent {...props} />
}

function SecureInstallButtonContent({
  slug,
  source,
  type,
}: SecureInstallButtonProps) {
  const {
    dismiss,
    error,
    isExpired,
    isPending,
    pending,
    secondsRemaining,
    startInstall,
  } = useInstallIntent(slug, source, type)

  if (pending && isExpired) {
    return (
      <div className="grid gap-2">
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          This install link expired. Your agent only accepts an install for{" "}
          {describeInstallWindow(INSTALL_WINDOW_SECONDS)} after it is issued.
        </p>
        <Button onClick={startInstall} disabled={isPending}>
          {isPending ? "Signing..." : "Issue a new install link"}
          <IconExternalLink />
        </Button>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="grid gap-2">
        <p className="flex items-center gap-2 rounded-lg border border-[var(--ironhub-line)] bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          <IconClock className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Approve this install in your agent within{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatRemaining(secondsRemaining ?? 0)}
            </span>
          </span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary">
            <a href={pending.redirectUrl} target="_blank" rel="noreferrer">
              Open your agent
              <IconExternalLink />
            </a>
          </Button>
          <Button variant="ghost" onClick={dismiss}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <Button onClick={startInstall} disabled={isPending}>
        {isPending ? "Signing..." : "Install to Agent"}
        <IconExternalLink />
      </Button>
      <p className="text-xs text-muted-foreground">
        Opens your agent in a new tab. You have{" "}
        {describeInstallWindow(INSTALL_WINDOW_SECONDS)} to approve the install
        before the link expires.
      </p>
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** `4:07`. Zero-padded seconds so the width does not jitter every tick. */
function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}
