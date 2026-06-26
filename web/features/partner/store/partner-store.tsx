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
  sourceType: "upload" | "prompt"
  sourceDetail: string // File name (e.g. circle-payments.zip) or prompt preview
  activationKeyword?: string
  reviews: ReviewCheck[]
  useCases?: string[]
  valueProp?: string
  valueTags?: string[]
  activationKeywords?: string[]
  activationTags?: string[]
  markdownContent?: string
}

export interface TeamMember {
  name: string
  email: string
  role: "Admin" | "Editor" | "Member"
  status: "Active" | "Invited"
}

export interface ActivityLog {
  id: string
  time: string
  user: string
  action: string
}

interface PartnerState {
  submissions: Submission[]
  teamMembers: TeamMember[]
  activities: ActivityLog[]
  orgName: string
  contactEmail: string
  installToken: string
  inviteDomains: string
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
  inviteMember: (name: string, email: string, role: TeamMember["role"]) => void
  removeMember: (email: string) => void
  regenerateInstallToken: () => void
  updateInviteDomains: (domains: string) => void
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
      sourceType: "upload",
      sourceDetail: "usdc-payments-v1.0.2.zip",
      activationKeyword: "pay",
      reviews: [
        { name: "Safety & Policy Scan", status: "passed", details: "All WASM sandbox constraints verified. No unsafe operations detected." },
        { name: "Configuration Check", status: "passed", details: "JSON structure validated. Correct metadata fields and permissions are present." },
        { name: "Component Quality Check", status: "passed", details: "0 verification issues found in compilation." }
      ]
    },
    {
      id: "api-auth",
      type: "skill",
      title: "API Auth Agent",
      version: "v0.9.0",
      updatedAt: "1d ago",
      visibility: "private",
      status: "in_review",
      sourceType: "prompt",
      sourceDetail: "You are a helpful API authentication assistant. Help the user configure their API keys securely...",
      activationKeyword: "auth",
      useCases: [
        "Securely store and retrieve API keys",
        "Generate authorization header signatures",
        "Validate JWT token expiry times"
      ],
      valueProp: "A helpdesk automation utility to verify developer credentials securely.",
      valueTags: ["Authentication", "Security", "Helper"],
      activationKeywords: ["auth", "authenticate", "login"],
      activationTags: ["credential-verify", "api-security"],
      markdownContent: `## Persona

The agent operates as a **helpful API authentication assistant**. It helps organization members configure, audit, and debug API keys and OAuth parameters in secure sandboxes.

## When to Use

- When developer credentials require validation.
- When generating secure headers for internal service calls.
`,
      reviews: [
        { name: "Safety & Policy Scan", status: "passed", details: "Prompt injection analysis passed. No forbidden system-override sequences detected." },
        { name: "Configuration Check", status: "passed", details: "Title, description, and model constraints parsed and validated." },
        { name: "Component Quality Check", status: "passed", details: "Dependencies linked. Awaiting manual reviewer signature." }
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
      sourceType: "upload",
      sourceDetail: "gas-station-tool-v1.0.0.zip",
      activationKeyword: "gas",
      reviews: [
        { name: "Safety & Policy Scan", status: "failed", details: "Hardcoded API key detected in package configuration line 42.", fix: "Use environment variables or custom prompt parameters." },
        { name: "Configuration Check", status: "failed", details: "Missing custom parameter definitions.", fix: "Define parameter boundaries in settings to document user inputs." },
        { name: "Component Quality Check", status: "passed", details: "Compilation checks passed. 0 security alerts." }
      ]
    }
  ],
  teamMembers: [
    { name: "Cameron", email: "cameron@circle.com", role: "Admin", status: "Active" },
    { name: "Brandon", email: "brandon@circle.com", role: "Editor", status: "Active" },
    { name: "Alice", email: "alice@circle.com", role: "Member", status: "Active" }
  ],
  activities: [
    { id: "act-1", time: "10 mins ago", user: "brandon@circle.com", action: "Updated `USDC Payments` to v1.0.2" },
    { id: "act-2", time: "2 hours ago", user: "cameron@circle.com", action: "Added `Gas Station Tool` to Private Space" },
    { id: "act-3", time: "1 day ago", user: "cameron@circle.com", action: "Updated `API Auth Agent` prompt" },
    { id: "act-4", time: "5 days ago", user: "alice@circle.com", action: "Drafted `Gas Station Tool` package" }
  ],
  orgName: "Circle Integration Team",
  contactEmail: "partner-support@circle.com",
  installToken: "ih_tok_circle_8f902ba9dc74f26b52c",
  inviteDomains: "@circle.com"
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined)

const SESSION_STORAGE_KEY = "ironhub_partner_state_v2"

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
    const baseSlug = submission.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item"

    setState((prev) => {
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
          { name: "Safety & Policy Scan", status: "passed", details: "All safety rules successfully verified." },
          { name: "Configuration Check", status: "passed", details: "Configuration file and settings verified." },
          { name: "Component Quality Check", status: "passed", details: "Deployment quality checks passed." }
        ]
      }

      const submissions = [newSubmission, ...prev.submissions]
      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "cameron@circle.com",
          action: `Added \`${submission.title}\` (${submission.version})`
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
          user: "cameron@circle.com",
          action: `Deleted \`${target.title}\` from Private Space`
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
      const title = target ? target.title : "Item"
      const versionStr = updates.version || (target ? target.version : "")

      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "cameron@circle.com",
          action: `Updated \`${title}\` to ${versionStr}`
        },
        ...prev.activities
      ]

      return { ...prev, submissions, activities }
    })
  }

  const inviteMember = (name: string, email: string, role: TeamMember["role"]) => {
    setState((prev) => {
      const newMember: TeamMember = {
        name,
        email,
        role,
        status: "Invited"
      }
      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "cameron@circle.com",
          action: `Invited \`${email}\` as ${role}`
        },
        ...prev.activities
      ]
      return {
        ...prev,
        teamMembers: [...prev.teamMembers, newMember],
        activities
      }
    })
  }

  const removeMember = (email: string) => {
    setState((prev) => {
      const teamMembers = prev.teamMembers.filter((m) => m.email !== email)
      const activities: ActivityLog[] = [
        {
          id: `act-${nextUid()}`,
          time: "Just now",
          user: "cameron@circle.com",
          action: `Removed \`${email}\` from organization`
        },
        ...prev.activities
      ]
      return { ...prev, teamMembers, activities }
    })
  }

  const regenerateInstallToken = () => {
    setState((prev) => ({
      ...prev,
      installToken: `ih_tok_circle_${Math.random().toString(16).slice(2, 18)}`
    }))
  }

  const updateInviteDomains = (domains: string) => {
    setState((prev) => ({
      ...prev,
      inviteDomains: domains
    }))
  }

  return (
    <PartnerContext.Provider
      value={{
        state,
        addSubmission,
        updateSubmission,
        removeSubmission,
        inviteMember,
        removeMember,
        regenerateInstallToken,
        updateInviteDomains,
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
