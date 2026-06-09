"use client"

import { useCallback, useEffect, useState } from "react"

import type {
  AgentInstallationInput,
  AgentInstallationView,
} from "@/lib/agent-installations/types"

type PendingAction = "create" | "delete" | "default" | "verify" | null
type AgentInstallationAction = Exclude<PendingAction, null>

export function useAgentInstallations(enabled: boolean) {
  const [installations, setInstallations] = useState<AgentInstallationView[]>(
    []
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await fetch("/api/agent-installations")
      const body = await readResponse(res)
      setInstallations(body.installations)
      setError(null)
    } catch (loadError) {
      setError(getMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  const create = async (input: AgentInstallationInput) => {
    await mutate("create", "/api/agent-installations", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }

  const setDefault = async (id: string) => {
    await mutate("default", `/api/agent-installations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isDefault: true }),
    })
  }

  const remove = async (id: string) => {
    await mutate("delete", `/api/agent-installations/${id}`, {
      method: "DELETE",
    })
  }

  const verify = async (id: string) => {
    await mutate("verify", `/api/agent-installations/${id}/verify`, {
      method: "POST",
    })
  }

  async function mutate(
    action: AgentInstallationAction,
    url: string,
    init: RequestInit
  ) {
    setPendingAction(action)
    setError(null)
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "content-type": "application/json" },
      })
      await readResponse(res)
      await load()
    } catch (mutateError) {
      setError(getMessage(mutateError))
    } finally {
      setPendingAction(null)
    }
  }

  return {
    create,
    error,
    installations,
    isLoading,
    pendingAction,
    refresh: load,
    remove,
    setDefault,
    verify,
  }
}

async function readResponse(res: Response) {
  if (res.status === 204) return {}
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? "Request failed.")
  return body
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed."
}
