import { Suspense } from "react"
import { notFound } from "next/navigation"

import { AccountScreen } from "@/features/account/components/account-screen"
import { isAccountRouteDisabled } from "@/lib/shared/feature-flags"

export default function AccountPage() {
  if (isAccountRouteDisabled) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-16 text-sm text-muted-foreground sm:px-6">
          Loading account...
        </main>
      }
    >
      <AccountScreen />
    </Suspense>
  )
}
