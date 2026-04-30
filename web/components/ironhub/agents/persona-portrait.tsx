"use client"

import Image from "next/image"
import type { CSSProperties } from "react"
import type { AgentModePreset } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"

type PersonaPortraitProps = {
  preset: AgentModePreset
  className?: string
  imageClassName?: string
  priority?: boolean
  sizes?: string
}

export function PersonaPortrait({
  preset,
  className,
  imageClassName,
  priority = false,
  sizes = "(min-width: 1280px) 20vw, (min-width: 768px) 50vw, 100vw",
}: PersonaPortraitProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl border bg-background/50",
        className
      )}
      style={
        {
          "--persona-accent": preset.artwork.accent,
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_oklab,var(--persona-accent)_28%,transparent),transparent_56%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
      <Image
        src={preset.artwork.src}
        alt={preset.artwork.alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          "object-contain object-bottom drop-shadow-[0_24px_36px_rgba(0,0,0,0.45)]",
          imageClassName
        )}
      />
    </div>
  )
}
