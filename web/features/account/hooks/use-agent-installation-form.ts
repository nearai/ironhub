"use client"

import { useState } from "react"
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
    setSharedKey("")
    setRevealed(false)
    setGenerateError(null)
  }

  const toggleRevealed = () => setRevealed((value) => !value)

  const regenerate = async () => {
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
      setRevealed(true)
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Could not generate a key."
      )
    } finally {
      setIsGenerating(false)
    }
  }

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
    if (success) {
      setSharedKey("")
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
