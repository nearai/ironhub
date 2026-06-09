"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"

export function AccountNavButton() {
  const { data: session, isPending } = authClient.useSession()
  const label = session?.user.name || session?.user.email || "Account"

  return (
    <Button
      asChild
      variant={session ? "default" : "outline"}
      size="sm"
      className="hidden max-w-40 rounded-full sm:inline-flex"
    >
      <Link href="/account" aria-label="Open account">
        <span className="truncate">{isPending ? "Account" : label}</span>
      </Link>
    </Button>
  )
}
