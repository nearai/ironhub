"use client"

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

  const notify = (message: string, tone: Toast["tone"] = "success") => {
    const id = nextUid()
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
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
            role="status"
            className={`ih-fade-up pointer-events-auto rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-sm ${tone}`}
          >
            {t.message}
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
