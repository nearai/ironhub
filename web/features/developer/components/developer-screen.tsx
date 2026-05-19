import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"

import { creationActions, resourceActions } from "./developer-actions"
import { DeveloperActionCard } from "./developer-action-card"
import { IliadStartCard } from "./iliad-start-card"
import { SuggestFeatureCard } from "./suggest-feature-card"

export function DeveloperScreen() {
  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="Contribute"
          title="Ship IronClaw Skills and Tools"
          description="Use the repo lifecycle to propose skill branches, WASM tool trunks, auth scopes, limits, and tracking updates."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {creationActions.map((action) => (
            <DeveloperActionCard
              key={action.title}
              {...action}
              primary={action.title === "Create Skill"}
            />
          ))}
        </div>

        <SuggestFeatureCard />

        <div className="grid gap-6 md:grid-cols-2">
          {resourceActions.map((action) => (
            <DeveloperActionCard key={action.title} {...action} />
          ))}
        </div>

        <IliadStartCard />
      </div>
    </HubLayout>
  )
}
