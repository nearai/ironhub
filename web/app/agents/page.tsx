import { AgentBuilder } from "@/components/ironhub/agents/agent-builder"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { PageHeader } from "@/components/ironhub/page-header"
import { getCatalog } from "@/lib/catalog.server"

export const dynamic = "force-dynamic"

export default async function AgentsPage() {
  const items = await getCatalog()
  const catalog = {
    skills: items.filter((item) => item.kind === "skill"),
    tools: items.filter((item) => item.kind === "tool"),
  }

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-6">
        <PageHeader
          eyebrow="Agent builder"
          title="Build a private IronClaw agent like a tactical loadout"
          description="Choose a mode, shape the soul, equip repo-backed skills and tools, then export a clean config for an IronClaw runtime."
        />
        <AgentBuilder catalog={catalog} />
      </div>
    </HubLayout>
  )
}
