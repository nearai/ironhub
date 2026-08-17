"use client"

import { IconLock, IconWorld } from "@tabler/icons-react"

/**
 * Visibility control shared by the create form and both edit forms. Copy
 * matches design.md D9 exactly — the public option is a *request*, not a
 * live listing, so keep the wording identical everywhere it appears.
 */
export function VisibilitySelector({
  visibility,
  onChange,
}: {
  visibility: "public" | "private"
  onChange: (value: "public" | "private") => void
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
      <label className="text-xs font-bold text-muted-foreground uppercase">
        Visibility & Distribution
      </label>
      <div className="grid grid-cols-2 gap-3 mt-0.5 max-w-xl">
        <button
          type="button"
          onClick={() => onChange("private")}
          className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${visibility === "private"
            ? "border-primary bg-primary/5 text-foreground shadow-sm"
            : "border-[var(--ironhub-line)]/50 bg-background/30 text-muted-foreground hover:bg-muted/10"
            }`}
        >
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${visibility === "private" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
            <IconLock className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">Private Space</span>
            <span className="text-xs leading-normal text-muted-foreground/80 block mt-0.5">
              Internal to your Org Space only.
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange("public")}
          className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${visibility === "public"
            ? "border-primary bg-primary/5 text-foreground shadow-sm"
            : "border-[var(--ironhub-line)]/50 bg-background/30 text-muted-foreground hover:bg-muted/10"
            }`}
        >
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${visibility === "public" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
            <IconWorld className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">Request public listing</span>
            <span className="text-xs leading-normal text-muted-foreground/80 block mt-0.5">
              Stays private to your org until an IronHub reviewer approves the listing.
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
