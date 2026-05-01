import { IconAlertCircle, IconCloud } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { links } from "@/lib/links"

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
      <Card size="sm">
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <IconAlertCircle className="size-5 text-primary" />
          Iliad public skills are temporarily unavailable. Repo-backed entries
          are still shown.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <IconCloud className="size-5 text-primary" />
          {loaded} of {total} public Iliad skills are included in this view.
        </span>
        <a
          href={links.iliad}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground hover:text-primary"
        >
          Visit Iliad
        </a>
      </CardContent>
    </Card>
  )
}
