import Link from "next/link"

import { cn } from "@/lib/shared/utils"

// Official IronHub mark — double chevron (assets/IronHub_Mark_Blue.svg).
// Rendered with currentColor so it themes for dark mode.
function IronHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 42 42"
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 7 L20 21 L7 35" />
      <path d="M22 7 L35 21 L22 35" />
    </svg>
  )
}

type BrandMarkProps = {
  compact?: boolean
  className?: string
}

export function BrandMark({ compact, className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="IronHub home"
    >
      <IronHubMark className="size-[26px] shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5" />
      {!compact && (
        <span className="font-sans text-[1.22rem] leading-none font-black tracking-[-0.02em]">
          Iron<span className="text-primary">Hub</span>
        </span>
      )}
    </Link>
  )
}
