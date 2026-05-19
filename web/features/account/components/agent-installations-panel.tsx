"use client"

import { IconInfoCircle, IconShieldCheck } from "@tabler/icons-react"

import { AgentInstallationDetails } from "@/features/account/components/agent-installation-details"
import { AgentInstallationForm } from "@/features/account/components/agent-installation-form"
import { useAgentInstallations } from "@/features/account/hooks/use-agent-installations"

type AgentInstallationsPanelProps = {
  isActive: boolean
}

export function AgentInstallationsPanel({
  isActive,
}: AgentInstallationsPanelProps) {
  const { create, error, installations, isLoading, pendingAction, verify } =
    useAgentInstallations(isActive)
  const isPending = pendingAction !== null
  const primaryInstallation =
    installations.find((installation) => installation.isDefault) ??
    installations[0] ??
    null

  return (
    <div className="grid gap-7">
      <div className="flex items-start gap-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--ironhub-line)] bg-primary/10 text-primary">
          <IconShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold">
            Agent install security
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure secure deep-links to your IronClaw agent.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading agents...</p>
        ) : primaryInstallation ? (
          <AgentInstallationDetails
            installation={primaryInstallation}
            isPending={isPending}
            onVerify={verify}
          />
        ) : (
          <AgentInstallationForm
            isPending={pendingAction === "create"}
            onSubmit={create}
          />
        )}

        <div className="flex items-center gap-3 rounded-xl border border-[var(--ironhub-line)] bg-background/45 px-4 py-3 text-sm text-muted-foreground">
          <IconInfoCircle className="size-4 shrink-0 text-primary" />
          <span>Signed install links expire in 5 minutes.</span>
        </div>
      </div>
    </div>
  )
}
