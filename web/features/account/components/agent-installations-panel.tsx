"use client"

import { IconInfoCircle, IconShieldCheck } from "@tabler/icons-react"

import { AgentInstallationForm } from "@/features/account/components/agent-installation-form"
import { AgentInstallationList } from "@/features/account/components/agent-installation-list"
import { useAgentInstallations } from "@/features/account/hooks/use-agent-installations"
import { describeInstallWindow } from "@/lib/agent-installations/install-timing"
import { isAgentInstallEnabled } from "@/lib/shared/feature-flags"

type AgentInstallationsPanelProps = {
  isActive: boolean
}

/**
 * "Agent registration failed." is the one error this screen can't make more
 * specific server-side -- the hub only knows the HMAC challenge didn't come
 * back valid, not why. Spell out the causes here (client-facing copy only;
 * the server's message and status code are untouched) so a failed Verify
 * points somewhere useful instead of just failing again.
 */
function describeInstallationError(message: string) {
  if (message !== "Agent registration failed.") return message

  return (
    "Agent registration failed. This usually means: the shared key doesn't " +
    "match what the agent is running with, the agent hasn't been restarted " +
    "since the key was set, or the Agent URL can't be reached from the hub."
  )
}

export function AgentInstallationsPanel({
  isActive,
}: AgentInstallationsPanelProps) {
  const {
    create,
    error,
    installations,
    isLoading,
    pendingAction,
    remove,
    setDefault,
    verify,
  } = useAgentInstallations(isActive)
  const isPending = pendingAction !== null

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
            Configure secure deep-links to your IronClaw agents.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {describeInstallationError(error)}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading agents...</p>
        ) : (
          <>
            <AgentInstallationList
              installations={installations}
              isPending={isPending}
              onDelete={remove}
              onSetDefault={setDefault}
              onVerify={verify}
            />
            <AgentInstallationForm
              isPending={pendingAction === "create"}
              onSubmit={create}
            />
          </>
        )}

        {/* A deadline for something the user cannot start is worse than no
            note at all: it implies a working flow and sends anyone who hits
            trouble hunting a timeout that never happened. Returns with the
            button. It also used to be repeated on every connection row, which
            is the wrong place -- the window is a property of the install flow,
            not of a connection. */}
        {isAgentInstallEnabled ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--ironhub-line)] bg-background/45 px-4 py-3 text-sm text-muted-foreground">
            <IconInfoCircle className="size-4 shrink-0 text-primary" />
            <span>
              Signed install links expire in {describeInstallWindow()}.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
