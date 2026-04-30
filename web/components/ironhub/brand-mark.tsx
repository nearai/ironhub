import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandMarkProps = {
  compact?: boolean
  className?: string
}

export function BrandMark({ compact, className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="IronHub home"
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/40 bg-primary text-primary-foreground shadow-sm">
        <svg
          viewBox="0 0 48 48"
          className="relative size-8 transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        >
          <path d="M10 7h28v34H10z" fill="currentColor" opacity="0.22" />
          <path
            d="M20 8 12 34c-.8 2.7 2.7 4.6 4.5 2.4L30 20c1.7-2.1.2-5.2-2.6-5.2h-2.8L27.2 8H20Z"
            fill="currentColor"
          />
          <path
            d="M29.8 8 22 34c-.8 2.7 2.7 4.6 4.5 2.4L40 20c1.7-2.1.2-5.2-2.6-5.2h-2.8L37.2 8h-7.4Z"
            fill="var(--background)"
            opacity="0.95"
          />
          <path
            d="M14 10 8 29c-.7 2.3 2.2 3.9 3.7 2.1L22.8 17c1.4-1.8.1-4.4-2.2-4.4h-2.2L20 10h-6Z"
            fill="var(--background)"
            opacity="0.95"
          />
        </svg>
      </span>
      {!compact && (
        <span className="grid leading-none">
          <span className="font-heading text-lg font-semibold">IronHub</span>
          <span className="text-[0.68rem] font-medium text-muted-foreground">
            IronClaw Skills
          </span>
        </span>
      )}
    </Link>
  )
}
