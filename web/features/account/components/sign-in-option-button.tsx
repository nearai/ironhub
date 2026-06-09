"use client"

import type { ComponentType } from "react"
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

type SignInOptionButtonProps = {
  Icon: ComponentType<{ className?: string }>
  isPending: boolean
  label: string
  onClick: () => void
  disabled: boolean
}

export function SignInOptionButton({
  Icon,
  isPending,
  label,
  onClick,
  disabled,
}: SignInOptionButtonProps) {
  const LeadingIcon = isPending ? IconLoader2 : Icon

  return (
    <Button
      size="lg"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="h-14 justify-between rounded-xl border-[var(--ironhub-line)] bg-background/80 pl-2 pr-4 text-base shadow-[0_10px_30px_rgb(43_130_212_/_0.08)] backdrop-blur-md hover:border-primary/45 hover:bg-card hover:shadow-[0_16px_38px_rgb(43_130_212_/_0.14)]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--ironhub-line)] bg-primary/8 text-foreground">
          <LeadingIcon
            className={isPending ? "size-5 animate-spin" : "size-5"}
          />
        </span>
        <span className="truncate">Continue with {label}</span>
      </span>
      <IconArrowRight className="size-4 text-muted-foreground transition-transform group-hover/button:translate-x-0.5" />
    </Button>
  )
}
