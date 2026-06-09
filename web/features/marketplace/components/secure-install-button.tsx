"use client"

import { IconExternalLink } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useInstallIntent } from "@/features/account/hooks/use-install-intent"

type SecureInstallButtonProps = {
  slug: string
}

export function SecureInstallButton({ slug }: SecureInstallButtonProps) {
  const { error, isPending, startInstall } = useInstallIntent(slug)

  return (
    <div className="grid gap-2">
      <Button onClick={startInstall} disabled={isPending}>
        {isPending ? "Signing..." : "Install to Agent"}
        <IconExternalLink />
      </Button>
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
