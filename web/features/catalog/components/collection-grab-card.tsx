import { IconBoxMultiple } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CollectionBundle } from "@/lib/catalog/collections"
import { TerminalBox } from "@/features/marketplace/components/terminal-box"

type CollectionGrabCardProps = {
  bundle: CollectionBundle
}

export function CollectionGrabCard({ bundle }: CollectionGrabCardProps) {
  const installCommand = `ironclaw hub collection install ${bundle.slug}`

  return (
    <Card id="bundle-manifest" className="bg-primary/8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <IconBoxMultiple className="size-5" />
          </span>
          <div>
            <CardTitle>Grab the Whole Collection</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Install or export the full bundle as one collection instead of
              collecting entries one by one.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{bundle.items.length} entries</Badge>
          <Badge variant="outline">{bundle.toolCount} tools</Badge>
          <Badge variant="outline">{bundle.skillCount} skills</Badge>
        </div>
        <TerminalBox title="collection bundle" copyText={installCommand}>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                $
              </span>
              <span className="text-slate-900 dark:text-slate-100">
                {installCommand}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                {">"}
              </span>
              <span className="text-slate-400 dark:text-slate-400">
                {bundle.items.length} entries selected
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                {">"}
              </span>
              <span className="text-slate-400 dark:text-slate-400">
                {bundle.toolCount} tools / {bundle.skillCount} skills
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                {">"}
              </span>
              <span className="text-slate-400 dark:text-slate-400">
                bundle ready for agent loadout
              </span>
            </div>
          </div>
        </TerminalBox>
      </CardContent>
    </Card>
  )
}
