"use client"

import { IconRefresh, IconShieldCheck } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AccountField } from "@/features/account/components/account-field"
import { useAgentInstallationForm } from "@/features/account/hooks/use-agent-installation-form"
import type { AgentInstallationInput } from "@/lib/agent-installations/types"

type AgentInstallationFormProps = {
  isPending: boolean
  onSubmit: (input: AgentInstallationInput) => Promise<void>
}

export function AgentInstallationForm({
  isPending,
  onSubmit,
}: AgentInstallationFormProps) {
  const {
    agentUrl,
    generateError,
    isGenerating,
    regenerate,
    revealed,
    setAgentUrl,
    setSharedKey,
    sharedKey,
    submit,
  } = useAgentInstallationForm(onSubmit)

  return (
    <form className="grid gap-2" onSubmit={submit}>
      <AccountField label="Agent URL">
        <Input
          id="agent-url"
          value={agentUrl}
          onChange={(event) => setAgentUrl(event.target.value)}
          placeholder="https://ironclaw.agent.near.ai"
          className="h-10 rounded-lg border-[var(--ironhub-line)] bg-background/70"
        />
      </AccountField>
      <AccountField
        label="IronClaw shared key"
        action={
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="rounded-lg border-[var(--ironhub-line)] bg-background/60"
            onClick={() => void regenerate()}
            disabled={isGenerating}
            aria-label="Generate shared key"
          >
            <IconRefresh className="size-4" />
          </Button>
        }
      >
        <Input
          id="shared-key"
          type={revealed ? "text" : "password"}
          value={sharedKey}
          onChange={(event) => setSharedKey(event.target.value)}
          placeholder="ihub_sk_..."
          className="h-10 rounded-lg border-[var(--ironhub-line)] bg-background/70"
        />
      </AccountField>
      {generateError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {generateError}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isPending}
        className="mt-3 w-fit rounded-lg px-4"
      >
        <IconShieldCheck className="size-4" />
        {isPending ? "Verifying..." : "Verify connection"}
      </Button>
    </form>
  )
}
