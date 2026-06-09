import { notFound } from "next/navigation"

import { AgentsScreen } from "@/features/agent-builder/components/agents-screen"
import { isAgentsRouteDisabled } from "@/lib/shared/feature-flags"

export const dynamic = "force-dynamic"

export default function AgentsPage() {
  if (isAgentsRouteDisabled) {
    notFound()
  }

  return <AgentsScreen />
}
