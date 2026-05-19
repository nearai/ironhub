"use client"

import { IconCircleCheck, IconCircleX, IconLink } from "@tabler/icons-react"

import { Separator } from "@/components/ui/separator"
import { AccountField } from "@/features/account/components/account-field"
import { CopyButton } from "@/features/account/components/copy-button"
import { InstallFlowSteps } from "@/features/account/components/install-flow-steps"
import { InstallOutcomeCard } from "@/features/account/components/install-outcome-card"
import {
  getInstallPreviewMessage,
  getInstallPreviewName,
  getInstallPreviewUrl,
} from "@/features/account/utils/install-preview"

type InstallIntentPreviewProps = {
  slug: string
}

export function InstallIntentPreview({ slug }: InstallIntentPreviewProps) {
  const name = getInstallPreviewName(slug)
  const message = getInstallPreviewMessage(slug)
  const redirectUrl = getInstallPreviewUrl(slug)

  return (
    <section className="grid gap-7 rounded-xl border border-[var(--ironhub-line)] bg-card/86 p-6 shadow-[var(--ironhub-shadow)] backdrop-blur-xl lg:col-span-2">
      <div className="flex items-start gap-4">
        <IconLink className="mt-1 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold">
            Install intent preview
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Example for installing {name}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid content-start gap-3">
          <AccountField
            label="Message (signed)"
            value={message}
            action={<CopyButton value={message} label="Copy signed message" />}
          />
          <AccountField
            label="Redirect URL (preview)"
            value={redirectUrl}
            action={
              <CopyButton value={redirectUrl} label="Copy redirect URL" />
            }
          />
        </div>

        <Separator className="my-4" />

        <InstallFlowSteps />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InstallOutcomeCard
          tone="valid"
          title="Valid link"
          icon={<IconCircleCheck className="size-6" />}
          body="Verified links show a confirm card with tool details (name, description, version, SHA-256)."
        />
        <InstallOutcomeCard
          tone="invalid"
          title="Invalid link"
          icon={<IconCircleX className="size-6" />}
          body="If verification fails (bad signature, expired ts, or used nonce) agent shows an error and no confirm card is displayed."
        />
      </div>
    </section>
  )
}
