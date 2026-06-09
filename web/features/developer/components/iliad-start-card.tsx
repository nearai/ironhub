import Image from "next/image"

import { Card, CardContent } from "@/components/ui/card"
import { ActionLink } from "@/features/shell/components/action-link"
import { links } from "@/lib/shared/links"

export function IliadStartCard() {
  return (
    <Card className="relative overflow-hidden rounded-xl border-primary/15 bg-gradient-to-r from-primary/8 via-primary/3 to-transparent shadow-sm">
      <CardContent className="px-5 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--ironhub-line)] bg-background shadow-sm">
            <Image
              src="/assets/iliad-logo.png"
              alt="Iliad Logo"
              width={44}
              height={44}
              className="size-full object-contain p-1.5"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold tracking-tight">
              Create IronClaw Skills, tools easily with Iliad
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Build custom IronClaw tools, skills, and bundles easily with the
              Iliad AI cloud platform. No technical experience needed.
            </p>
          </div>
          <ActionLink href={links.iliad} external variant="default" size="sm">
            Get started
          </ActionLink>
        </div>
      </CardContent>
    </Card>
  )
}
