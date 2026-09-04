"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 1,
      },
    },
  })
}

// The workspace mounts this provider twice: once in the site header (for the
// notification bell, which lives outside the /dashboard layout) and once around the
// workspace shell. In the browser they must share one cache, otherwise
// accepting an invitation in the header leaves the page below showing stale
// organizations. On the server each render gets its own client so no state
// leaks between requests.
let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function PartnerQueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
