import type { ComponentType } from "react"

import { ActionLink } from "@/features/shell/components/action-link"
import { Card, CardContent } from "@/components/ui/card"

type DeveloperActionCardProps = {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  badgeColor: string
  buttonText: string
  primary?: boolean
}

export function DeveloperActionCard({
  title,
  description,
  href,
  icon: Icon,
  badgeColor,
  buttonText,
  primary = false,
}: DeveloperActionCardProps) {
  return (
    <Card className="group relative overflow-hidden border border-[var(--ironhub-line)] bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:bg-card hover:shadow-[var(--ironhub-shadow)]">
      <CardContent className="flex h-full min-h-[220px] flex-col justify-between gap-5 p-6">
        <div className="space-y-4">
          <div
            className={`inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${badgeColor} border shadow-sm transition-transform duration-300 group-hover:scale-105`}
          >
            <Icon className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <ActionLink
          href={href}
          external
          variant={primary ? "default" : "outline"}
        >
          {buttonText}
        </ActionLink>
      </CardContent>
    </Card>
  )
}
