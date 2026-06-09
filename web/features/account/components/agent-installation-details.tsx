"use client"

import { IconRefresh, IconShieldCheck } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { AccountField } from "@/features/account/components/account-field"
import { CopyButton } from "@/features/account/components/copy-button"
import type { AgentInstallationView } from "@/lib/agent-installations/types"

type AgentInstallationDetailsProps = {
  installation: AgentInstallationView
  isPending: boolean
  onVerify: (id: string) => Promise<void>
}

export function AgentInstallationDetails({
  installation,
  isPending,
  onVerify,
}: AgentInstallationDetailsProps) {
  const keyHint = getKeyHint(installation.keyFingerprint)

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <AccountField
          label="Agent URL"
          value={installation.agentUrl}
          action={
            <CopyButton value={installation.agentUrl} label="Copy agent URL" />
          }
        />
        <AccountField
          label="IronClaw shared key"
          value={keyHint}
          action={
            <div className="flex items-center gap-2">
              <CopyButton
                value={installation.keyFingerprint}
                label="Copy key fingerprint"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="rounded-lg border-[var(--ironhub-line)] bg-background/60"
                disabled={isPending}
                aria-label="Verify connection"
                title="Verify connection"
                onClick={() => onVerify(installation.id)}
              >
                <IconRefresh className="size-4" />
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => onVerify(installation.id)}
          className="rounded-lg px-4"
        >
          <IconShieldCheck className="size-4" />
          {isPending ? "Verifying..." : "Verify connection"}
        </Button>
        {installation.verifiedAt ? (
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            HMAC ready
          </span>
        ) : null}
      </div>
    </div>
  )
}

function getKeyHint(fingerprint: string) {
  return fingerprint.replace("...", "••••••••••••")
}
