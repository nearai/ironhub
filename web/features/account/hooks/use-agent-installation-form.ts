"use client"

import { useState } from "react"
import type { FormEvent } from "react"

import type { AgentInstallationInput } from "@/lib/agent-installations/types"

export function useAgentInstallationForm(
  onSubmit: (input: AgentInstallationInput) => Promise<void>
) {
  const [agentUrl, setAgentUrl] = useState("")
  const [sharedKey, setSharedKey] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

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
    await onSubmit({
      agentUrl,
      isDefault: true,
      label: "Primary IronClaw",
      sharedKey,
    })
    setSharedKey("")
    setRevealed(false)
  }

  return {
    agentUrl,
    generateError,
    isGenerating,
    regenerate,
    revealed,
    setAgentUrl,
    setSharedKey,
    sharedKey,
    submit,
  }
}
