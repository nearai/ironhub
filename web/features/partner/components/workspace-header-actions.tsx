"use client"

import { PartnerQueryProvider } from "@/features/partner/api/query-provider"
import { ToastProvider } from "@/features/partner/store/toast-provider"
import { NotificationBell } from "./notification-bell"

/**
 * Workspace controls that belong in the site header rather than the workspace
 * sidebar. Carries its own providers because the header renders above the
 * /mvp layout; the query client is a browser singleton, so this shares one
 * cache with the workspace below it.
 */
export function WorkspaceHeaderActions() {
  return (
    <PartnerQueryProvider>
      <ToastProvider>
        <NotificationBell />
      </ToastProvider>
    </PartnerQueryProvider>
  )
}
