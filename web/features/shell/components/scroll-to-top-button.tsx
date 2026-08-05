"use client"

import { useEffect, useState } from "react"
import { IconArrowUp } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/shared/utils"

const VISIBILITY_THRESHOLD = 400

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > VISIBILITY_THRESHOLD)
    }

    updateVisibility()
    window.addEventListener("scroll", updateVisibility, { passive: true })

    return () => window.removeEventListener("scroll", updateVisibility)
  }, [])

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }

  return (
    <Button
      type="button"
      size="icon-lg"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={cn(
        "fixed right-4 bottom-4 z-40 rounded-full shadow-lg transition-[opacity,transform] duration-200 sm:right-6 sm:bottom-6",
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <IconArrowUp aria-hidden="true" />
    </Button>
  )
}
