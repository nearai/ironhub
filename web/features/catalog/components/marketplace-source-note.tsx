import { IconAlertCircle, IconCloud } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { links } from "@/lib/shared/links"

type MarketplaceSourceNoteProps = {
  loaded: number
  total: number
  error: string | null
}

export function MarketplaceSourceNote({
  loaded,
  total,
  error,
}: MarketplaceSourceNoteProps) {
  if (error) {
    return (
      <Card
        size="sm"
        className="border-[var(--ih-border-ui)] bg-[var(--ih-surface-muted)] backdrop-blur-md"
      >
        <CardContent className="flex items-center gap-3 text-sm text-[var(--ih-ink-soft)]">
          <IconAlertCircle className="size-5 text-[var(--ih-accent)]" />
          Iliad public skills are temporarily unavailable. Repo-backed entries
          are still shown.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      size="sm"
      className="border-[var(--ih-border-ui)] bg-[var(--ih-surface-muted)] backdrop-blur-md"
    >
      <CardContent className="flex flex-col gap-3 text-sm text-[var(--ih-ink-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <IconCloud className="size-5 text-[var(--ih-accent)]" />
          {loaded} of {total} public Iliad skills are included in this view.
        </span>
        <a
          href={links.iliad}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[var(--ih-ink)] transition-colors hover:text-[var(--ih-accent)]"
        >
          Visit Iliad
        </a>
      </CardContent>
    </Card>
  )
}
