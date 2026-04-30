import Link from "next/link"
import Image from "next/image"

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
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        <Image
          src="/favicon-96x96.png"
          alt=""
          width={40}
          height={40}
          aria-hidden="true"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </span>
      {!compact && (
        <span className="font-heading text-lg leading-none font-semibold">
          IronHub
        </span>
      )}
    </Link>
  )
}
