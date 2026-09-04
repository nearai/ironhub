"use client"

import { useState } from "react"
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useArtifactTextContent } from "@/features/partner/api/artifact-content"

type SoulInstallDisclosureProps = {
  /** The soul whose document is disclosed. Read through the owner-facing
   *  content route, which is scoped to the caller's active organization. */
  artifactId: string
  /** Rendered once the reader has confirmed -- the control that installs. */
  children: React.ReactNode
}

/**
 * The full text of a soul, shown before its install is confirmed.
 *
 * A soul is the one artifact type whose content is not sandboxed by the agent:
 * it is read as the opening of the system prompt, ahead of memory and ahead of
 * tool descriptions. A name, a version and a one-line description do not
 * convey what it will make an agent do, and the difference between a benign
 * soul and a hostile one is invisible at that level -- so the document itself
 * is the only disclosure that means anything (design.md -- "Full-text
 * disclosure before install").
 *
 * Shown in a scrollable, delimited region rather than a modal that has to be
 * dismissed: a long soul is a wall of text either way, and a modal turns it
 * into a wall of text that is in the way. The reader can scroll it, leave it,
 * and come back to it.
 */
export function SoulInstallDisclosure({
  artifactId,
  children,
}: SoulInstallDisclosureProps) {
  const soulContent = useArtifactTextContent(artifactId, "soul_md")
  const [acknowledged, setAcknowledged] = useState(false)

  if (soulContent.data === undefined) {
    return soulContent.isError ? (
      <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
        <span>
          This soul&apos;s document could not be loaded, so it cannot be shown
          before installing. Installing is turned off until it can be.
        </span>
      </div>
    ) : (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 shrink-0 animate-spin" />
        <span>Loading the soul document...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--ironhub-line)] bg-card p-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          Read this soul before installing it
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything below is placed at the top of the agent&apos;s system
          prompt, before its memory and before its tools. It is the whole of
          what this install adds.
        </p>
      </div>

      <div
        // `tabindex` on the scroll container, not on a child: a keyboard user
        // reaching a scrollable region has no other way to scroll it.
        tabIndex={0}
        role="group"
        aria-label="Soul document"
        className="max-h-[24rem] w-full overflow-auto rounded-lg border border-[var(--ironhub-line)] bg-muted/40 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground select-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {soulContent.data === null || soulContent.data.trim() === ""
          ? "This soul has no document stored."
          : soulContent.data}
      </div>

      {/* Stated rather than papered over (design.md -- Risks): the agent has
          no soul entry, so a soul installs through the skill path and lands
          wherever that path puts a skill. Until ask 3 to IronClaw is answered
          the hub cannot promise where it ends up, and claiming otherwise on
          the one screen that is meant to earn trust would be the wrong place
          to be optimistic. */}
      <p className="text-xs text-muted-foreground">
        Your agent has no dedicated place for a soul yet, so it installs
        through the same path as a skill. Where the file lands on the agent is
        not yet guaranteed.
      </p>

      {acknowledged ? (
        children
      ) : (
        <Button
          type="button"
          onClick={() => setAcknowledged(true)}
          className="h-10 rounded-lg"
        >
          I have read this soul — continue
        </Button>
      )}
    </div>
  )
}
