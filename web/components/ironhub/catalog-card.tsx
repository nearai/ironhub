"use client"

import Link from "next/link"
import { IconCheck, IconCopy, IconUserCircle } from "@tabler/icons-react"
import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"

type CatalogCardProps = {
  item: CatalogItem
  compact?: boolean
}

export function CatalogCard({ item, compact = false }: CatalogCardProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`ironhub install ${item.slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy!", err)
    }
  }, [item.slug])

  return (
    <Card
      className="group relative flex h-full flex-col overflow-hidden border-[var(--ih-border-ui)] bg-[var(--ih-surface-muted)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[var(--ih-border-ui-hover)] hover:bg-[var(--ih-surface)] hover:shadow-[var(--ih-shadow)]"
    >
      <Link 
        href={`/marketplace/${item.slug}`} 
        className="absolute inset-0 z-0"
        aria-label={`View ${item.name}`}
      />
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge 
            variant="secondary" 
            className="rounded-[var(--ih-radius-pill)] bg-[var(--ih-accent)]/10 px-2 py-0 text-[0.65rem] font-bold uppercase tracking-tight text-[var(--ih-accent)] border-none"
          >
            {item.kind === "skill" ? "SKILL" : "WASM TOOL"}
          </Badge>
          {item.origin === "iliad" && (
            <Badge 
              variant="outline" 
              className="rounded-[var(--ih-radius-pill)] border-[var(--ih-line)]/20 px-2 py-0 text-[0.65rem] font-bold uppercase tracking-tight text-[var(--ih-ink-soft)]"
            >
              Iliad
            </Badge>
          )}
        </div>
        <CardTitle className="mt-3 text-[1.25rem] font-bold leading-tight text-[var(--ih-ink)] transition-colors group-hover:text-[var(--ih-accent)]">
          {item.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-1 flex-col gap-4">
        <p className="line-clamp-2 text-[0.875rem] leading-relaxed text-[var(--ih-ink-soft)]">
          {item.description}
        </p>
      </CardContent>

      <CardFooter className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t border-[var(--ih-line)]/5 pt-4">
        <div className="flex items-center gap-2 text-[0.82rem] text-[var(--ih-ink-soft)]">
          <span className="inline-flex items-center gap-1">
            by {item.author}
          </span>
          <span className="opacity-40">v{item.version}</span>
        </div>
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="relative z-20 h-8 gap-1.5 rounded-[var(--ih-radius-sm)] border-[var(--ih-line)] bg-[var(--ih-surface)] px-3 text-xs font-medium text-[var(--ih-ink-soft)] transition-colors hover:bg-[var(--ih-surface-muted)] hover:text-[var(--ih-ink)]"
        >
          {copied ? (
            <>
              <IconCheck className="size-3.5 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <IconCopy className="size-3.5" />
              <span>Install</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
