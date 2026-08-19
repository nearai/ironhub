"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { INSTALL_CLICK_THROUGH_WINDOW_SECONDS } from "@/lib/agent-installations/install-timing"

/**
 * A started install, held on screen so its deadline can be shown.
 *
 * The hub used to navigate straight to `redirectUrl` and forget the intent
 * existed. That is why the deadline was invisible: `expiresAt` has always been
 * in the response and there was no surface left to render it on. The agent is
 * opened in a new tab instead, so this page survives to count down and to
 * offer a re-issue when the window closes.
 */
export type PendingInstall = {
  redirectUrl: string
  expiresAt: number
}

export type InstallIntentState = {
  error: string | null
  isPending: boolean
  pending: PendingInstall | null
  /** Seconds left against `expiresAt`, floored at 0, or null when idle. */
  secondsRemaining: number | null
  isExpired: boolean
  startInstall: () => Promise<void>
  dismiss: () => void
}

export const INSTALL_WINDOW_SECONDS = INSTALL_CLICK_THROUGH_WINDOW_SECONDS

export function useInstallIntent(slug: string | null): InstallIntentState {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [pending, setPending] = useState<PendingInstall | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // One interval, alive only while an install is pending. A countdown that
  // keeps ticking after the install is dismissed is a re-render every second
  // for the life of the page. The effect only subscribes -- the clock is
  // re-read where the pending install is set, so nothing sets state
  // synchronously during an effect body.
  const hasPending = pending !== null
  useEffect(() => {
    if (!hasPending) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasPending])

  const startInstall = useCallback(async () => {
    if (!slug) return

    const accountSetupPath = getAccountInstallPath(slug)
    setError(null)
    setIsPending(true)
    try {
      const res = await fetch("/api/install-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      })

      if (res.status === 401) {
        router.push(accountSetupPath)
        return
      }

      const body = await res.json()

      if (!res.ok) {
        if (body.error === "No default Agent Installation.") {
          router.push(accountSetupPath)
          return
        }

        throw new Error(body.error ?? "Install intent failed.")
      }

      const expiresAt = Date.parse(body.expiresAt)
      setNow(Date.now())
      setPending({
        redirectUrl: body.redirectUrl,
        // A response without a parseable `expiresAt` still has a deadline --
        // the agent's, which it enforces regardless of what we render. Deriving
        // one from the known window is closer to the truth than showing none.
        expiresAt: Number.isNaN(expiresAt)
          ? Date.now() + INSTALL_CLICK_THROUGH_WINDOW_SECONDS * 1000
          : expiresAt,
      })
      // Opened rather than navigated to: this page has to stay alive to own
      // the deadline. `noopener` because the agent is a different origin and
      // has no business holding a handle on this window. A blocked popup is
      // survivable -- the pending card renders the same URL as a link.
      window.open(body.redirectUrl, "_blank", "noopener,noreferrer")
    } catch (installError) {
      const message =
        installError instanceof Error
          ? installError.message
          : "Install intent failed."
      // The agent's own verdict on a missed deadline, shown as the deadline
      // state rather than as its raw text. `StaleTimestamp` names an agent
      // constant the user has never heard of and says nothing about what to do
      // next; the expired card says both.
      if (isStaleDeliveryError(message)) {
        const at = Date.now()
        setNow(at)
        setPending({ redirectUrl: "", expiresAt: at })
        return
      }
      setError(message)
    } finally {
      setIsPending(false)
    }
  }, [router, slug])

  const dismiss = useCallback(() => {
    setPending(null)
    setError(null)
  }, [])

  const secondsRemaining = pending
    ? Math.max(0, Math.ceil((pending.expiresAt - now) / 1000))
    : null

  return {
    error,
    isPending,
    pending,
    secondsRemaining,
    isExpired: secondsRemaining === 0,
    startInstall,
    dismiss,
  }
}

/**
 * The agent rejects a delivery whose `ts` is more than 300 s from its own
 * clock and reports it as `StaleTimestamp` (C16). The hub cannot observe that
 * rejection directly -- the agent has no callback into this app -- so this
 * matches the vocabulary on whichever path does surface it here: an error
 * relayed back through the intent API today, and anything the agent reports
 * over a future callback. Matching text is unpleasant, and it is confined to
 * this one function so the day a structured code exists there is one place to
 * change.
 */
function isStaleDeliveryError(message: string): boolean {
  return /stale\s*timestamp|timestamp.*(stale|too old|drift)/i.test(message)
}

function getAccountInstallPath(slug: string) {
  return `/account?intent=install&slug=${encodeURIComponent(slug)}`
}
