import Link from "next/link"
import { IconChevronsRight } from "@tabler/icons-react"

import { cn } from "@/lib/shared/utils"

type BrandMarkProps = {
  compact?: boolean
  className?: string
}

export function BrandMark({ compact, className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2", className)}
      aria-label="IronHub home"
    >
      <IconChevronsRight
        className="size-6 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5"
        stroke={3}
        aria-hidden="true"
      />
      {!compact && (
        <span className="font-sans text-lg leading-none font-bold tracking-tight">
          Iron<span className="text-primary">Hub</span>
        </span>
      )}
    </Link>
  )
}
