"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"

import type { AgentInstallationInput } from "@/lib/agent-installations/types"

export type SharedKeySource = "generate" | "paste"

// Mirrors the shape of the server-side rule in
// lib/agent-installations/validation.ts -- for display only. The server
// stays the one source of truth; this never gates submit.
export const SHARED_KEY_PREFIX = "ihub_sk_"
const SHARED_KEY_MIN_LENGTH = 32
const SHARED_KEY_MIN_DISTINCT = 12

/**
 * A pasted key that obviously cannot pass server validation (wrong prefix,
 * too short, clearly not copied in full) gets a hint before the user burns a
 * round trip on "Verify connection" finding out the same thing.
 */
export function getSharedKeyFormatHint(value: string): string | null {
  const key = value.trim()
  if (!key) return null

  if (!key.startsWith(SHARED_KEY_PREFIX)) {
    return `IronClaw keys start with "${SHARED_KEY_PREFIX}" — check you copied the whole value.`
  }

  if (key.length < SHARED_KEY_MIN_LENGTH) {
    return `That looks short for an IronClaw key (at least ${SHARED_KEY_MIN_LENGTH} characters) — check you copied the whole value.`
  }

  if (
    new Set(key.slice(SHARED_KEY_PREFIX.length)).size < SHARED_KEY_MIN_DISTINCT
  ) {
    return "That key looks low-entropy — check you copied the real value, not a placeholder."
  }

  return null
}

/**
 * Where a generated key is remembered between visits. Only keys minted by
 * "generate" are stored: a pasted key already lives on the user's agent, and
 * copying it into this browser's storage would spread the secret for nothing.
 *
 * This is a shared secret in `localStorage`, so it is readable by any script
 * running on this origin. That is the trade the convenience buys: the
 * alternative is a fresh key on every visit, which means re-exporting the
 * variable and restarting the agent every time.
 */
const SHARED_KEY_STORAGE_KEY = "ironhub.account.agentSharedKey"

function readStoredSharedKey(): string | null {
  try {
    if (typeof window === "undefined") return null
    const stored = window.localStorage.getItem(SHARED_KEY_STORAGE_KEY)
    // Anything that could not have come from the generator is ignored rather
    // than shown back to the user as if the hub had issued it.
    return stored && stored.startsWith(SHARED_KEY_PREFIX) ? stored : null
  } catch {
    return null
  }
}

function writeStoredSharedKey(value: string): void {
  try {
    window.localStorage.setItem(SHARED_KEY_STORAGE_KEY, value)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The key
    // still works for this visit; it just will not survive a reload.
  }
}

export function useAgentInstallationForm(
  onSubmit: (input: AgentInstallationInput) => Promise<boolean>
) {
  const [keySource, setKeySourceState] = useState<SharedKeySource>("generate")
  const [agentUrl, setAgentUrl] = useState("")
  const [sharedKey, setSharedKey] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Switching source starts the key over: a key minted here has no place in
  // the "paste" flow, and a pasted key has no place in the "generate" one --
  // carrying one across is how a user ends up verifying against the wrong
  // key without noticing.
  const setKeySource = (next: SharedKeySource) => {
    setKeySourceState(next)
    // Coming back to "generate" restores the key this browser already holds,
    // so switching tabs to look at the other flow does not cost the user the
    // key their agent is already running with.
    setSharedKey(next === "generate" ? (readStoredSharedKey() ?? "") : "")
    setRevealed(false)
    setGenerateError(null)
  }

  const toggleRevealed = () => setRevealed((value) => !value)

  const regenerate = useCallback(async () => {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/agent-installations/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error ?? "Could not generate a key.")
      }
      setSharedKey(body.sharedKey)
      writeStoredSharedKey(body.sharedKey)
      setRevealed(true)
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Could not generate a key."
      )
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // The form opens with a key already in hand: whichever one this browser
  // generated before, or a fresh one if there is none. Minting is a pure
  // server-side random -- it writes nothing -- so doing it on arrival costs
  // the user one fewer click before they can copy the export line.
  //
  // This runs after mount, not in a lazy initialiser, because the stored key
  // does not exist on the server: reading it during the first render would
  // make the client's markup disagree with the server's.
  const didAutoFill = useRef(false)
  useEffect(() => {
    if (didAutoFill.current) return
    didAutoFill.current = true

    const stored = readStoredSharedKey()
    if (stored) {
      // Restored keys stay masked -- the user asked for the key to be here,
      // not for it to be on screen.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSharedKey(stored)
      return
    }

    void regenerate()
  }, [regenerate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const success = await onSubmit({
      agentUrl,
      isDefault: true,
      label: "Primary IronClaw",
      sharedKey,
    })
    // Only clear the key on success -- on failure the user needs it right
    // where it was to fix whatever "Verify connection" just complained about.
    //
    // A generated key is kept even then: it is the key the agent was just
    // verified against, so blanking the field would only prompt the user to
    // mint a replacement the agent does not know.
    if (success) {
      if (keySource === "paste") {
        setSharedKey("")
      }
      setRevealed(false)
    }
  }

  return {
    agentUrl,
    generateError,
    isGenerating,
    keySource,
    regenerate,
    revealed,
    setAgentUrl,
    setKeySource,
    setSharedKey,
    sharedKey,
    submit,
    toggleRevealed,
  }
}
