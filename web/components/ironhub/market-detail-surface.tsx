"use client"

import { useState } from "react"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog-types"
import { formatBytes } from "@/lib/format-utils"
import { cn } from "@/lib/utils"

type MarketDetailSurfaceProps = {
  item: CatalogItem
}

export function MarketDetailSurface({ item }: MarketDetailSurfaceProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Technical tags are tags that are not value tags
  const techTags = item.tags.filter(tag => !item.valueTags.includes(tag))

  return (
    <div className="w-full min-w-0 rounded-xl border border-[var(--ironhub-line)] bg-card/60 shadow-[var(--ironhub-shadow)] backdrop-blur-xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="technical-details-content"
        className={cn(
          "flex w-full items-center justify-between px-5 py-3 text-left transition-colors bg-muted/30 dark:bg-muted/15 hover:bg-muted/50 dark:hover:bg-muted/25",
          isOpen && "border-b border-border/30"
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/90 font-heading">
            Developer & Technical Details
          </h3>
          <Badge variant="outline" className="text-[10px] h-4 border-border/30">
            {item.kind}
          </Badge>
        </div>
        {isOpen ? (
          <IconChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <IconChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div
        id="technical-details-content"
        role="region"
        aria-labelledby="technical-details-trigger"
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-8 p-6 lg:grid-cols-3">
            {/* Technical Specifications */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Specifications
              </h4>
              <div className="grid gap-3">
                {item.kind === "tool" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">WIT Interface</span>
                      <span className="font-mono font-medium">{item.witVersion}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Action Capacity</span>
                      <span className="font-medium">{item.actionCount} actions</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Memory Budget</span>
                      <span className="font-medium">{item.maxContextTokens.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Trunk</span>
                      <span className="font-mono text-xs truncate max-w-[150px]">{item.trunk}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Auth Model</span>
                  <span className="font-medium">{item.auth.model}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Source Path</span>
                  <span className="font-mono text-[10px] break-all text-muted-foreground/80">{item.sourcePath}</span>
                </div>
                {item.origin === "iliad" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Artifact Size</span>
                    <span className="font-medium">{formatBytes(item.contentSize || 0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security & Network */}
            <div className="space-y-4 pt-6 border-t lg:pt-0 lg:border-t-0 lg:border-l lg:pl-8 border-border/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Security & Network
              </h4>
              <div className="space-y-3">
                {item.kind === "tool" && item.httpAllowlist.length > 0 ? (
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-2 uppercase font-semibold">Network Allowlist</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.httpAllowlist.map((host) => (
                        <Badge key={host} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {host}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : item.kind === "skill" && item.activationKeywords.length > 0 ? (
                   <div>
                    <span className="text-[10px] text-muted-foreground block mb-2 uppercase font-semibold">Activation Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.activationKeywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Standard isolated execution environment.</p>
                )}
                
                {item.auth.requiredSecrets.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1 uppercase font-semibold">Required Secrets</span>
                    <div className="flex flex-wrap gap-1">
                      {item.auth.requiredSecrets.map(secret => (
                        <code key={secret} className="text-[10px] bg-muted px-1 rounded">{secret}</code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Limits & Tags */}
            <div className="space-y-4 pt-6 border-t lg:pt-0 lg:border-t-0 lg:border-l lg:pl-8 border-border/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Constraints & Tags
              </h4>
              <div className="space-y-3">
                {item.limits.length > 0 && (
                  <div className="space-y-1">
                     <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Known Limits</span>
                     <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                       {item.limits.map((limit, i) => (
                         <li key={i}>{limit}</li>
                       ))}
                     </ul>
                  </div>
                )}
                {techTags.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-2 uppercase font-semibold">Technical Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {techTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {item.origin === "iliad" && (
            <div className="border-t border-border/30 px-6 py-4 bg-muted/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground/70 font-bold">Artifact Path</span>
                  <span className="text-xs font-mono text-muted-foreground break-all">{item.contentPath}</span>
                </div>
                {item.capabilitiesUrl && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">Capabilities Enabled</Badge>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-border/30 px-6 py-4 bg-muted/5">
            <p className="text-[10px] leading-relaxed text-muted-foreground italic">
              {item.origin === "iliad"
                ? `Public ${item.kind} mirrored from Iliad publisher ${item.remoteUserId ?? "unknown"}.`
                : item.kind === "skill"
                ? `Skill branch derived from trunk ${item.trunk}.`
                : item.related.branches?.length
                  ? `Tool trunk with active branches: ${item.related.branches.join(", ")}.`
                  : "Standalone tool trunk without current skill branches."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
