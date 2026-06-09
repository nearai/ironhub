"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type SubmissionStatus = "approved" | "in_review" | "rejected"
export type SubmissionVisibility = "public" | "private"

export interface ReviewCheck {
  name: string
  status: "passed" | "failed"
  details: string
  fix?: string
}

export interface Submission {
  id: string
  type: "tool" | "skill"
  title: string
  version: string
  updatedAt: string
  visibility: SubmissionVisibility
  status: SubmissionStatus
  repoUrl: string
  branch: string
  webhookActive: boolean
  entryPoint: string
  reviews: ReviewCheck[]
}

export interface TeamMember {
  name: string
  githubHandle: string
  status: string
}

export interface ActivityLog {
  id: string
  time: string
  user: string
  action: string
}

export interface WebhookLog {
  id: string
  time: string
  method: string
  endpoint: string
  status: string
  details: string
}

interface PartnerState {
  submissions: Submission[]
  teamMembers: TeamMember[]
  activities: ActivityLog[]
  orgName: string
  contactEmail: string
  githubOrg: string
  payloadUrl: string
  secretKey: string
  webhookLogs: WebhookLog[]
}

export interface Toast {
  id: string
  message: string
  tone: "success" | "error" | "info"
}

interface PartnerContextType {
  state: PartnerState
  addSubmission: (submission: Omit<Submission, "id" | "updatedAt" | "reviews">) => void
  updateSubmission: (id: string, updates: Partial<Submission>) => void
  removeSubmission: (id: string) => void
  addWebhookLog: (log: Omit<WebhookLog, "id" | "time">) => void
  unlinkGithub: () => void
  linkGithub: (org: string) => void
  regenerateSecret: () => void
  notify: (message: string, tone?: Toast["tone"]) => void
}

const defaultState: PartnerState = {
  submissions: [
    {
      id: "usdc-payments",
      type: "tool",
      title: "USDC Payments",
      version: "v1.0.2",
      updatedAt: "2h ago",
      visibility: "public",
      status: "approved",
      repoUrl: "github.com/circle-org/usdc-payments",
      branch: "main",
      webhookActive: true,
      entryPoint: "main.wasm",
      reviews: [
        { name: "Security Scan", status: "passed", details: "All WASM sandbox constraints verified. No unsafe memory operations detected." },
        { name: "Manifest Validation", status: "passed", details: "JSON manifest structured correctly. Required fields are present." },
        { name: "Dependency Check", status: "passed", details: "0 vulnerability alerts found in upstream modules." }
      ]
    },
    {
      id: "api-auth",
      type: "skill",
      title: "API Auth",
      version: "v0.9.0",
      updatedAt: "1d ago",
      visibility: "private",
      status: "in_review",
      repoUrl: "github.com/circle-org/api-auth-skill",
      branch: "main",
      webhookActive: true,
      entryPoint: "index.js",
      reviews: [
        { name: "Security Scan", status: "passed", details: "WASM sandbox parameters verified. Execution boundaries restricted." },
        { name: "Manifest Validation", status: "passed", details: "Manifest details extracted. Scope parameters under review." },
        { name: "Dependency Check", status: "passed", details: "Dependencies linked. Awaiting manual reviewer signature." }
      ]
    },
    {
      id: "gas-station",
      type: "tool",
      title: "Gas Station Tool",
      version: "v1.0.0",
      updatedAt: "5d ago",
      visibility: "public",
      status: "rejected",
      repoUrl: "github.com/circle-org/gas-station-tool",
      branch: "main",
      webhookActive: true,
      entryPoint: "main.py",
      reviews: [
        { name: "Security Scan", status: "failed", details: "Hardcoded API key found in `utils.py` line 42.", fix: "Use environment variables or IronClaw secret vault." },
        { name: "Manifest Validation", status: "failed", details: "Missing `required_permissions` field in manifest.", fix: "Include `required_permissions` in manifest.json to document endpoint boundaries." },
        { name: "Dependency Check", status: "passed", details: "Dependencies check passed. 0 security alerts." }
      ]
    }
  ],
  teamMembers: [
    { name: "Cameron", githubHandle: "@cameron_circle", status: "Active" },
    { name: "Brandon", githubHandle: "@brandon_dev", status: "Active" },
    { name: "Alice", githubHandle: "@alice_sec", status: "Active" }
  ],
  activities: [
    { id: "act-1", time: "10 mins ago", user: "@brandon_dev", action: "Updated `USDC Payments` v1.0.2" },
    { id: "act-2", time: "2 hours ago", user: "@cameron_circle", action: "Submitted `Gas Station Tool`" },
    { id: "act-3", time: "1 day ago", user: "@cameron_circle", action: "Updated `API Auth` v0.9.0" },
    { id: "act-4", time: "5 days ago", user: "@alice_sec", action: "Created `Gas Station Tool` submission" }
  ],
  orgName: "Circle Integration Team",
  contactEmail: "partner-support@circle.com",
  githubOrg: "@circle-org",
  payloadUrl: "https://hub.ironclaw.com/api/v1/webhooks/github/circle-org",
  secretKey: "circle_webhook_sec_8f902ba9dc74",
  webhookLogs: [
    { id: "log-1", time: "2026-05-31 10:00:00", method: "POST", endpoint: "/v1/webhooks/github/circle-org", status: "200 OK", details: "v1.0.2 triggered and successfully parsed." },
    { id: "log-2", time: "2026-05-30 14:21:00", method: "POST", endpoint: "/v1/webhooks/github/circle-org", status: "400 Bad Request", details: "Manifest file missing in commit payload." }
  ]
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined)

const SESSION_STORAGE_KEY = "ironhub_partner_state"

// Monotonic counter for client-only unique ids (avoids Date.now/Math.random collisions)
let uidCounter = 0
const nextUid = () => `${++uidCounter}-${(uidCounter * 2654435761) % 100000}`

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PartnerState>(defaultState)
  const [isLoaded, setIsLoaded] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = (message: string, tone: Toast["tone"] = "success") => {
    const id = nextUid()
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }

  // Load state from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        setTimeout(() => {
          setState(data)
          setIsLoaded(true)
        }, 0)
        return
      }
    } catch (e) {
      console.error("Failed to load partner store state:", e)
    }
    setTimeout(() => setIsLoaded(true), 0)
  }, [])

  // Save state to sessionStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state))
      } catch (e) {
        console.error("Failed to save partner store state:", e)
      }
    }
  }, [state, isLoaded])

  const addSubmission = (submission: Omit<Submission, "id" | "updatedAt" | "reviews">) => {
    const baseSlug = submission.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "submission"

    setState((prev) => {
      // Ensure id uniqueness against existing submissions (avoids dup React keys + route clashes)
      const taken = new Set(prev.submissions.map((s) => s.id))
      let id = baseSlug
      let n = 2
      while (taken.has(id)) {
        id = `${baseSlug}-${n++}`
      }

      const newSubmission: Submission = {
        ...submission,
        id,
        updatedAt: "Just now",
        reviews: [
          { name: "Security Scan", status: "passed", details: "Static analysis check finished. All constraints verified." },
          { name: "Manifest Validation", status: "passed", details: "Manifest parsed successfully." },
          { name: "Dependency Check", status: "passed", details: "No security issues discovered." }
        ]
      }

      const submissions = [newSubmission, ...prev.submissions]
      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "@cameron_circle",
          action: `Submitted \`${submission.title}\` ${submission.version}`
        },
        ...prev.activities
      ]
      return { ...prev, submissions, activities }
    })
  }

  const removeSubmission = (id: string) => {
    setState((prev) => {
      const target = prev.submissions.find((sub) => sub.id === id)
      if (!target) return prev
      const submissions = prev.submissions.filter((sub) => sub.id !== id)
      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "@cameron_circle",
          action: `Deleted \`${target.title}\` submission`
        },
        ...prev.activities
      ]
      return { ...prev, submissions, activities }
    })
  }

  const updateSubmission = (id: string, updates: Partial<Submission>) => {
    setState((prev) => {
      const submissions = prev.submissions.map((sub) => {
        if (sub.id === id) {
          return { ...sub, ...updates, updatedAt: "Just now" }
        }
        return sub
      })

      const target = prev.submissions.find((sub) => sub.id === id)
      const title = target ? target.title : "Submission"
      const versionStr = updates.version || (target ? target.version : "")

      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "@cameron_circle",
          action: `Updated \`${title}\` ${versionStr}`
        },
        ...prev.activities
      ]

      return { ...prev, submissions, activities }
    })
  }

  const addWebhookLog = (log: Omit<WebhookLog, "id" | "time">) => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const now = new Date()
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    const newLog: WebhookLog = {
      ...log,
      id: `log-${Date.now()}`,
      time: timeStr
    }

    setState((prev) => ({
      ...prev,
      webhookLogs: [newLog, ...prev.webhookLogs]
    }))
  }

  const unlinkGithub = () => {
    setState((prev) => ({
      ...prev,
      githubOrg: "",
      payloadUrl: "",
      secretKey: ""
    }))
  }

  const linkGithub = (org: string) => {
    const formattedOrg = org.startsWith("@") ? org : `@${org}`
    const orgNameOnly = org.replace("@", "")
    setState((prev) => ({
      ...prev,
      githubOrg: formattedOrg,
      payloadUrl: `https://hub.ironclaw.com/api/v1/webhooks/github/${orgNameOnly}`,
      secretKey: `circle_webhook_sec_${Math.random().toString(16).slice(2, 14)}`
    }))
  }

  const regenerateSecret = () => {
    setState((prev) => {
      if (!prev.githubOrg) return prev
      return {
        ...prev,
        secretKey: `circle_webhook_sec_${Math.random().toString(16).slice(2, 14)}`
      }
    })
  }

  return (
    <PartnerContext.Provider
      value={{
        state,
        addSubmission,
        updateSubmission,
        removeSubmission,
        addWebhookLog,
        unlinkGithub,
        linkGithub,
        regenerateSecret,
        notify,
      }}
    >
      {children}
      <ToastViewport toasts={toasts} />
    </PartnerContext.Provider>
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

export function usePartnerStore() {
  const context = useContext(PartnerContext)
  if (!context) {
    throw new Error("usePartnerStore must be used within a PartnerProvider")
  }
  return context
}
