"use client"

import { IconX } from "@tabler/icons-react"
import React, { createContext, useContext, useState } from "react"

export interface Toast {
  id: string
  message: string
  tone: "success" | "error" | "info"
}

interface ToastContextType {
  notify: (message: string, tone?: Toast["tone"]) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let uidCounter = 0
const nextUid = () => `${++uidCounter}-${(uidCounter * 2654435761) % 100000}`

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const notify = (message: string, tone: Toast["tone"] = "success") => {
    const id = nextUid()
    setToasts((prev) => [...prev, { id, message, tone }])
    // design D2: an error is not scheduled for removal -- it stays until the
    // member dismisses it, since it may need to be read and acted on.
    if (tone !== "error") {
      setTimeout(() => dismiss(id), 3200)
    }
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    // Rendered unconditionally (design D2, task 1.4): if this returned null
    // while empty, the live region would not exist yet when the first
    // message arrives, so assistive technology would never announce it.
    // Spans the full viewport width (rather than `left-1/2
    // -translate-x-1/2` with no width of its own, whose shrink-to-fit
    // maximum is 100% - 50% = half the viewport -- exactly 180px at
    // 375px, which wrapped ordinary messages onto a tall narrow column
    // for no reason) so each toast below is free to size itself up to
    // its own max-width instead of the container's.
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2"
    >
      {toasts.map((t) => {
        const tone =
          t.tone === "error"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : t.tone === "info"
              ? "border-[var(--ironhub-line)] bg-popover text-foreground"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        return (
          <div
            key={t.id}
            // Capped independently of the viewport container: wide enough
            // for a real message to read as one compact line where
            // possible, but never touching the screen edges (the
            // `calc()` mirrors a 1rem gutter on each side) and never
            // wider than is comfortable on a large screen.
            className={`ih-fade-up pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border py-2.5 pr-2 pl-4 text-xs font-semibold shadow-lg backdrop-blur-sm sm:max-w-sm ${tone}`}
          >
            <span className="break-words [overflow-wrap:anywhere]">
              {t.message}
            </span>
            {/* workspace-ui-design: interactive targets are at least 40px in
                their smaller dimension at phone widths -- the icon stays
                small, the hit area does not. This control is the only way
                to clear an error toast now that errors no longer
                auto-dismiss. */}
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-current opacity-70 transition-opacity hover:opacity-100"
            >
              <IconX className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
