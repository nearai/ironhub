import type { ReactNode } from "react"

import { cn } from "@/lib/shared/utils"

type InstallOutcomeCardProps = {
  icon: ReactNode
  title: string
  body: string
  tone: "valid" | "invalid"
}

export function InstallOutcomeCard({
  body,
  icon,
  title,
  tone,
}: InstallOutcomeCardProps) {
  const isValid = tone === "valid"

  return (
    <div
      className={cn(
        "flex gap-4 rounded-xl border p-5",
        isValid
          ? "border-emerald-500/28 bg-emerald-500/7"
          : "border-red-500/28 bg-red-500/7"
      )}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0",
          isValid ? "text-emerald-600" : "text-red-600"
        )}
      >
        {icon}
      </span>
      <div className="grid gap-2">
        <h3
          className={cn(
            "font-heading text-base font-semibold",
            isValid ? "text-emerald-700" : "text-red-700"
          )}
        >
          {title}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  )
}
