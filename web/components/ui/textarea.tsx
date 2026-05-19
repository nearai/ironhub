import * as React from "react"

import { cn } from "@/lib/shared/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-xl border border-border/90 bg-background/70 px-3 py-3 text-base shadow-[inset_0_1px_0_rgb(255_255_255_/_0.55)] transition-colors outline-none placeholder:text-muted-foreground hover:border-primary/45 focus-visible:border-ring focus-visible:bg-background/90 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:shadow-none dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
