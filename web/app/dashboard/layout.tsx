import { notFound, redirect } from "next/navigation"

import { PartnerLayoutShell } from "@/features/partner/components/partner-layout-shell"
import { getAuthSession } from "@/lib/auth/session"
import { buildPrivateMetadata } from "@/lib/discovery/metadata"
import { isWorkspaceRouteDisabled } from "@/lib/shared/feature-flags"

export const metadata = buildPrivateMetadata("Partner Workspace")

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isWorkspaceRouteDisabled) {
    notFound()
  }

  const session = await getAuthSession()
  if (!session) {
    redirect("/account?next=/dashboard/catalog")
  }

  return <PartnerLayoutShell>{children}</PartnerLayoutShell>
}
