import { notFound } from "next/navigation"

import { AgentsScreen } from "@/features/agent-builder/components/agents-screen"
import { buildPublicMetadata } from "@/lib/discovery/metadata"
import { isAgentsRouteDisabled } from "@/lib/shared/feature-flags"

export const dynamic = "force-dynamic"

export const metadata = buildPublicMetadata({
  title: "Create your own IronClaw Agent",
  description:
    "Assemble an IronClaw agent loadout from public IronHub skills and WebAssembly tools.",
  path: "/agents",
})

export default function AgentsPage() {
  if (isAgentsRouteDisabled) {
    notFound()
  }

  return <AgentsScreen />
}
