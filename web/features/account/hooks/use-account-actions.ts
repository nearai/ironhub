"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { authClient } from "@/lib/auth/client"

type Provider = "google" | "github" | "near"

export function useAccountActions() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const session = authClient.useSession()
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urlError = searchParams.get("error")
  const visibleError = error ?? (urlError ? "Sign-in failed." : null)

  const signInSocial = async (provider: "google" | "github") => {
    setError(null)
    setPendingProvider(provider)
    await authClient.signIn.social(
      {
        provider,
        callbackURL: "/account",
        errorCallbackURL: "/account",
      },
      {
        onSuccess: () => {
          authClient.$store.notify("$sessionSignal")
        },
        onError: (ctx) => {
          setPendingProvider(null)
          setError(ctx.error.message ?? "Sign-in failed.")
        },
      }
    )
  }

  const signInNear = async () => {
    setError(null)
    setPendingProvider("near")
    await authClient.signIn.near({
      onSuccess: () => {
        setPendingProvider(null)
        router.refresh()
        authClient.$store.notify("$sessionSignal")
      },
      onError: (signInError) => {
        setPendingProvider(null)
        setError(signInError.message)
      },
    })
  }

  const signOut = async () => {
    if (isSigningOut) {
      return
    }

    setError(null)
    setIsSigningOut(true)

    try {
      await authClient.near.disconnect()
    } catch {
      // Keep auth sign-out working even if wallet provider rejects disconnect.
    }

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.refresh()
            authClient.$store.notify("$sessionSignal")
          },
          onError: (ctx) => {
            setError(ctx.error.message ?? "Sign-out failed.")
          },
        },
      })
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Sign-out failed."
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  return {
    error: visibleError,
    isSigningOut,
    isPending: session.isPending,
    pendingProvider,
    session: session.data,
    signInGithub: () => signInSocial("github"),
    signInGoogle: () => signInSocial("google"),
    signInNear,
    signOut,
  }
}
