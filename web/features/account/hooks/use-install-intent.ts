"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function useInstallIntent(slug: string | null) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const startInstall = async () => {
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

      window.location.href = body.redirectUrl
    } catch (installError) {
      setError(
        installError instanceof Error
          ? installError.message
          : "Install intent failed."
      )
    } finally {
      setIsPending(false)
    }
  }

  return { error, isPending, startInstall }
}

function getAccountInstallPath(slug: string) {
  return `/account?intent=install&slug=${encodeURIComponent(slug)}`
}
