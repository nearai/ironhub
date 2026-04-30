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
          eyebrow="Agents / New agent"
          title="Choose a Persona"
          description="Each persona comes with a preconfigured soul, default skills, and recommended tools."
        />
        <AgentBuilder catalog={catalog} />
      </div>
    </HubLayout>
  )
}
