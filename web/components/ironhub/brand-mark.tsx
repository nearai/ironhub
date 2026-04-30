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
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/30 bg-primary text-primary-foreground shadow-[0_0_30px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
        <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_38%,rgba(255,255,255,0.35)_39%_43%,transparent_44%)]" />
        <svg
          viewBox="0 0 48 48"
          className="relative size-8 transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        >
          <path
            d="M24 4 9 10v12c0 10.5 6.1 17.6 15 22 8.9-4.4 15-11.5 15-22V10L24 4Z"
            fill="currentColor"
            opacity="0.96"
          />
          <path
            d="M17 14h14l-2.3 6.7H34l-11.8 15 2.1-9.2H15L17 14Z"
            fill="var(--background)"
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
