import { notFound, redirect } from "next/navigation"

import { PartnerLayoutShell } from "@/features/partner/components/partner-layout-shell"
import { getAuthSession } from "@/lib/auth/session"
import { buildPrivateMetadata } from "@/lib/discovery/metadata"
import { isMvpRouteDisabled } from "@/lib/shared/feature-flags"

export const metadata = buildPrivateMetadata("Partner Workspace")

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isMvpRouteDisabled) {
    notFound()
  }

  const session = await getAuthSession()
  if (!session) {
    redirect("/account?next=/mvp/dashboard")
  }

  return <PartnerLayoutShell>{children}</PartnerLayoutShell>
}
