import { Suspense } from "react"

import { AccountScreen } from "@/features/account/components/account-screen"

export default function AccountPage() {
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
