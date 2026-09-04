"use client"

import { PartnerQueryProvider } from "@/features/partner/api/query-provider"
import { NotificationBell } from "./notification-bell"

/**
 * Workspace controls that belong in the site header rather than the workspace
 * sidebar. Carries its own query provider because the header renders above the
 * /dashboard layout; the query client is a browser singleton, so this shares one
 * cache with the workspace below it. `ToastProvider` is mounted once, at the
 * root layout (design D1) -- not here.
 */
export function WorkspaceHeaderActions() {
  return (
    <PartnerQueryProvider>
      <NotificationBell />
    </PartnerQueryProvider>
  )
}
