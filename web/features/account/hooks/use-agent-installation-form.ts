"use client"

import { useState } from "react"
import type { FormEvent } from "react"

import type { AgentInstallationInput } from "@/lib/agent-installations/types"

export function useAgentInstallationForm(
  onSubmit: (input: AgentInstallationInput) => Promise<void>
) {
  const [agentUrl, setAgentUrl] = useState("")
  const [sharedKey, setSharedKey] = useState("")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      agentUrl,
      isDefault: true,
      label: "Primary IronClaw",
      sharedKey,
    })
    setSharedKey("")
  }

  return {
    agentUrl,
    setAgentUrl,
    setSharedKey,
    sharedKey,
    submit,
  }
}
