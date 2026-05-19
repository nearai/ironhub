"use client"

import { IconRefresh, IconShieldCheck, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { AgentInstallationView } from "@/lib/agent-installations/types"

type AgentInstallationListProps = {
  installations: AgentInstallationView[]
  isPending: boolean
  onDelete: (id: string) => Promise<void>
  onSetDefault: (id: string) => Promise<void>
  onVerify: (id: string) => Promise<void>
}

export function AgentInstallationList({
  installations,
  isPending,
  onDelete,
  onSetDefault,
  onVerify,
}: AgentInstallationListProps) {
  if (installations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-background/35 p-4 text-sm text-muted-foreground">
        No Agent Installations yet.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {installations.map((installation) => (
        <div
          key={installation.id}
          className="grid gap-3 rounded-lg border border-border/70 bg-background/45 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-semibold">
                  {installation.label}
                </h3>
                {installation.verifiedAt ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                    HMAC ready
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm break-all text-muted-foreground">
                {installation.agentUrl}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {installation.keyFingerprint}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={installation.isDefault}
                disabled={isPending || installation.isDefault}
                onCheckedChange={() => onSetDefault(installation.id)}
              />
              <Button
                size="icon"
                variant="outline"
                disabled={isPending}
                onClick={() => onVerify(installation.id)}
                title="Verify connection"
              >
                <IconShieldCheck />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={isPending}
                onClick={() => onDelete(installation.id)}
                title="Delete"
              >
                <IconTrash />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconRefresh className="size-3.5" />
            Signed install links expire in 5 minutes.
          </div>
        </div>
      ))}
    </div>
  )
}
