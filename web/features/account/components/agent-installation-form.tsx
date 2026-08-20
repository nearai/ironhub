"use client"

import {
  IconClipboardText,
  IconEye,
  IconEyeOff,
  IconKey,
  IconRefresh,
  IconShieldCheck,
  IconTerminal2,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AccountField } from "@/features/account/components/account-field"
import { CopyButton } from "@/features/account/components/copy-button"
import {
  SHARED_KEY_PREFIX,
  getSharedKeyFormatHint,
  useAgentInstallationForm,
} from "@/features/account/hooks/use-agent-installation-form"
import type { SharedKeySource } from "@/features/account/hooks/use-agent-installation-form"
import { cn } from "@/lib/shared/utils"
import type { AgentInstallationInput } from "@/lib/agent-installations/types"

type AgentInstallationFormProps = {
  isPending: boolean
  onSubmit: (input: AgentInstallationInput) => Promise<boolean>
}

const KEY_SOURCES: {
  value: SharedKeySource
  label: string
  icon: typeof IconKey
}[] = [
  { value: "generate", label: "Generate a key", icon: IconKey },
  { value: "paste", label: "Use a key from IronClaw", icon: IconClipboardText },
]

export function AgentInstallationForm({
  isPending,
  onSubmit,
}: AgentInstallationFormProps) {
  const {
    agentUrl,
    generateError,
    isGenerating,
    keySource,
    regenerate,
    revealed,
    setAgentUrl,
    setKeySource,
    setSharedKey,
    sharedKey,
    submit,
    toggleRevealed,
  } = useAgentInstallationForm(onSubmit)

  const keyHint =
    keySource === "paste" ? getSharedKeyFormatHint(sharedKey) : null

  return (
    <form className="grid grid-cols-1 gap-3" onSubmit={submit}>
      {/* Step 1: choose where the key comes from. Both paths are equally
          real -- neither is a fallback -- so they get equal weight here. */}
      <div className="grid grid-cols-1 gap-1.5">
        <span className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
          Shared key source
        </span>
        <div
          role="group"
          aria-label="Shared key source"
          className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--ironhub-line)] bg-muted/40 p-1"
        >
          {KEY_SOURCES.map(({ value, label, icon: Icon }) => {
            const isSelected = value === keySource
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setKeySource(value)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isSelected
                    ? "bg-card text-foreground shadow-[var(--ironhub-shadow)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: get or enter the key. */}
      <AccountField
        label="IronClaw shared key"
        action={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={toggleRevealed}
              disabled={!sharedKey}
              aria-label={revealed ? "Hide shared key" : "Show shared key"}
            >
              {revealed ? (
                <IconEyeOff className="size-4" />
              ) : (
                <IconEye className="size-4" />
              )}
            </Button>
            <CopyButton value={sharedKey} label="Copy shared key" />
            {keySource === "generate" ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="rounded-lg border-[var(--ironhub-line)] bg-background/60"
                onClick={() => void regenerate()}
                disabled={isGenerating}
                aria-label={
                  sharedKey ? "Regenerate shared key" : "Generate shared key"
                }
              >
                <IconRefresh className="size-4" />
              </Button>
            ) : null}
          </div>
        }
      >
        <Input
          id="shared-key"
          aria-label="IronClaw shared key"
          type={revealed ? "text" : "password"}
          value={sharedKey}
          onChange={(event) => setSharedKey(event.target.value)}
          readOnly={keySource === "generate"}
          placeholder={
            keySource === "generate"
              ? isGenerating
                ? "Generating a key..."
                : "Use the refresh button for a new key"
              : "ihub_sk_..."
          }
          aria-describedby={keyHint ? "shared-key-hint" : undefined}
          className="h-10 rounded-lg border-[var(--ironhub-line)] bg-background/70"
        />
      </AccountField>
      {keyHint ? (
        <p
          id="shared-key-hint"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
        >
          {keyHint}
        </p>
      ) : null}
      {generateError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {generateError}
        </p>
      ) : null}

      {/* Step 3: put the key on the agent and restart it. */}
      {keySource === "generate" ? (
        <GenerateInstructions sharedKey={sharedKey} revealed={revealed} />
      ) : (
        <PasteInstructions />
      )}

      {/* Step 4: point at the agent, then verify. */}
      <AccountField label="Agent URL">
        <Input
          id="agent-url"
          aria-label="Agent URL"
          value={agentUrl}
          onChange={(event) => setAgentUrl(event.target.value)}
          placeholder="https://ironclaw.agent.near.ai"
          className="h-10 rounded-lg border-[var(--ironhub-line)] bg-background/70"
        />
      </AccountField>

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

function GenerateInstructions({
  revealed,
  sharedKey,
}: {
  revealed: boolean
  sharedKey: string
}) {
  const command = (key: string) =>
    `export IRONHUB_AGENT_SHARED_KEY=${key}\nironclaw serve`
  // The eye toggle above has to mean something here too: printing the secret
  // in full underneath a field the user just hid would undo it. Copy still
  // carries the real value, so hiding costs nothing.
  const displayed = command(
    sharedKey ? (revealed ? sharedKey : maskKey(sharedKey)) : "<the key above>"
  )

  return (
    <div className="rounded-xl border border-[var(--ironhub-line)] bg-background/45 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <IconTerminal2
          className="size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        Set this on the machine running your IronClaw agent, then restart it.
      </p>
      <p className="mt-1 text-muted-foreground">
        The agent only reads this variable on startup — Verify will fail until
        the agent has restarted with the new key.
      </p>
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--ironhub-line)] bg-muted/40 p-3">
        <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
          {displayed}
        </pre>
        <CopyButton
          value={sharedKey ? command(sharedKey) : ""}
          label="Copy setup command"
        />
      </div>
    </div>
  )
}

/** Enough of the key to recognise which one it is, none of it to read off. */
function maskKey(value: string) {
  return `${value.slice(0, SHARED_KEY_PREFIX.length + 4)}${"•".repeat(12)}`
}

function PasteInstructions() {
  return (
    <div className="rounded-xl border border-[var(--ironhub-line)] bg-background/45 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <IconClipboardText
          className="size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        Paste the key your IronClaw agent is already running with.
      </p>
      <p className="mt-1 text-muted-foreground">
        It has to be the exact value set as IRONHUB_AGENT_SHARED_KEY on that
        agent — Verify checks for an exact match, not a prefix.
      </p>
    </div>
  )
}
