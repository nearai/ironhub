import { notFound } from "next/navigation"

import { PartnerLayoutShell } from "@/features/partner/components/partner-layout-shell"
import { isMvpRouteDisabled } from "@/lib/shared/feature-flags"

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isMvpRouteDisabled) {
    notFound()
  }

  return <PartnerLayoutShell>{children}</PartnerLayoutShell>
}
