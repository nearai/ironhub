"use client"

import React, { useState } from "react"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/features/shell/components/page-header"
import {
  IconCopy,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconSend,
  IconBrandGithub,
  IconBuildings,
  IconBolt,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

export default function SettingsPage() {
  const { state, addWebhookLog, unlinkGithub, linkGithub, regenerateSecret, notify } = usePartnerStore()
  const { orgName, contactEmail, githubOrg, payloadUrl, secretKey, webhookLogs } = state

  // Form states
  const [profileName, setProfileName] = useState(orgName)
  const [profileEmail, setProfileEmail] = useState(contactEmail)
  const [newGithubInput, setNewGithubInput] = useState("")

  // Copy status
  const [copiedPayload, setCopiedPayload] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Reveal secret
  const [revealSecret, setRevealSecret] = useState(false)

  // Simulated syncing animation
  const [isSyncing, setIsSyncing] = useState(false)

  const handleCopy = async (text: string, type: "payload" | "secret") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "payload") {
        setCopiedPayload(true)
        setTimeout(() => setCopiedPayload(false), 2000)
      } else {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
      }
      notify(type === "payload" ? "Payload URL copied" : "Secret key copied", "info")
    } catch (e) {
      console.error("Failed to copy text:", e)
      notify("Copy failed — check clipboard permissions", "error")
    }
  }

  const handleTestWebhook = () => {
    setIsSyncing(true)
    setTimeout(() => {
      addWebhookLog({
        method: "POST",
        endpoint: "/v1/webhooks/github/circle-org",
        status: "200 OK",
        details: `Auto-sync pipeline triggered. Synced 1 modification: release v${(1 + Math.random() * 9).toFixed(1)} verified.`,
      })
      setIsSyncing(false)
      notify("Test webhook delivered → 200 OK")
    }, 1200)
  }

  const handleLinkGithub = (e: React.FormEvent) => {
    e.preventDefault()
    if (newGithubInput) {
      linkGithub(newGithubInput)
      setNewGithubInput("")
      notify(`Linked GitHub org @${newGithubInput.replace(/^@/, "")}`)
    }
  }

  const handleUnlink = () => {
    unlinkGithub()
    notify("GitHub organization unlinked", "info")
  }

  const handleRegenerate = () => {
    regenerateSecret()
    setRevealSecret(true)
    notify("Webhook secret regenerated")
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Console Settings"
        title="Organization Settings"
        description="Configure organization identifiers, repository link webhooks, and sync keys."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Organization & Credentials */}
        <div className="flex flex-col gap-6">
          {/* Org Profile */}
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <IconBuildings className="size-4 text-primary" />
              Organization Profile
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Organization Name
                </label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="rounded-full bg-background/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Contact Support Email
                </label>
                <Input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="rounded-full bg-background/50"
                />
              </div>

              {/* GitHub Link Handler */}
              <div className="border-t border-[var(--ironhub-line)]/50 pt-4 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <IconBrandGithub className="size-3.5" />
                  GitHub Organization Connection
                </span>

                {githubOrg ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <span className="text-xs font-semibold text-foreground">
                      Linked to: <code className="font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">{githubOrg}</code>
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 rounded-full text-[10px]"
                        >
                          Unlink Org
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Unlink {githubOrg}?</DialogTitle>
                          <DialogDescription>
                            This clears the webhook endpoint and secret key, and suspends member sync. You will need to re-link and reconfigure your GitHub repository webhook.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-2 flex gap-3">
                          <DialogClose asChild>
                            <Button type="button" variant="outline" className="flex-1 rounded-full">
                              Cancel
                            </Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={handleUnlink}
                              className="flex-1 rounded-full"
                            >
                              Unlink
                            </Button>
                          </DialogClose>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <form onSubmit={handleLinkGithub} className="flex gap-2">
                    <Input
                      placeholder="e.g. circle-org"
                      value={newGithubInput}
                      onChange={(e) => setNewGithubInput(e.target.value)}
                      className="rounded-full flex-1 bg-background/50 text-xs"
                      required
                    />
                    <Button type="submit" size="sm" className="rounded-full text-xs">
                      Link GitHub
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Card>

          {/* Webhook keys */}
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <IconBolt className="size-4" />
                Webhook Triggers
              </h3>
              {githubOrg && (
                <Button
                  onClick={handleTestWebhook}
                  disabled={isSyncing}
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <IconSend className="size-3" />
                  {isSyncing ? "Triggering..." : "Send Test Webhook"}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              To trigger automated rebuilds and security checks, configure this webhook in your GitHub Organization {"->"} Settings {"->"} Webhooks.
            </p>

            {githubOrg ? (
              <div className="flex flex-col gap-4 mt-2">
                {/* Payload URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Payload URL
                  </label>
                  <div className="relative flex gap-2">
                    <Input
                      readOnly
                      value={payloadUrl}
                      className="font-mono text-xs pr-10 rounded-full bg-background/70"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(payloadUrl, "payload")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    >
                      {copiedPayload ? (
                        <IconCheck className="size-4 text-emerald-600" />
                      ) : (
                        <IconCopy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Secret Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Secret Key
                  </label>
                  <div className="relative flex gap-2">
                    <Input
                      type={revealSecret ? "text" : "password"}
                      readOnly
                      value={secretKey}
                      className="font-mono text-xs pr-20 rounded-full bg-background/70"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setRevealSecret(!revealSecret)}
                        className="h-8 w-8 rounded-full"
                      >
                        {revealSecret ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(secretKey, "secret")}
                        className="h-8 w-8 rounded-full"
                      >
                        {copiedSecret ? (
                          <IconCheck className="size-4 text-emerald-600" />
                        ) : (
                          <IconCopy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Regenerate secret */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start rounded-full text-[10px]"
                    >
                      <IconRefresh className="size-3" />
                      Regenerate Secret
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Regenerate webhook secret?</DialogTitle>
                      <DialogDescription>
                        The current secret stops working immediately. You must update the secret in your GitHub repository webhook settings, or deliveries will fail signature verification.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 flex gap-3">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" className="flex-1 rounded-full">
                          Cancel
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          type="button"
                          onClick={handleRegenerate}
                          className="flex-1 rounded-full"
                        >
                          Regenerate
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--ironhub-line)] p-6 text-center text-xs text-muted-foreground">
                Please link your organization GitHub above to generate webhook endpoints and secret keys.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Webhook Live logs terminal */}
        <div className="flex flex-col gap-6">
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col flex-1">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-3">
              <IconRefresh className={`size-4 text-primary ${isSyncing ? "animate-spin" : ""}`} />
              Recent Webhook Deliveries
            </h3>

            <div className="flex-1 flex flex-col bg-slate-950 font-mono text-[10px] text-slate-300 rounded-2xl p-4 shadow-inner min-h-[300px]">
              {webhookLogs.length === 0 ? (
                <div className="text-slate-500 text-center my-auto">
                  No webhook delivery telemetry received.
                </div>
              ) : (
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[480px] pr-1">
                  {webhookLogs.map((log) => {
                    const isSuccess = log.status.includes("200")
                    return (
                      <div key={log.id} className="border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-slate-500 font-sans">{log.time}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-destructive/10 text-red-400 border border-destructive/20"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 font-bold">
                          <span className="text-blue-400">{log.method}</span>
                          <span className="text-slate-400 truncate">{log.endpoint}</span>
                        </div>
                        <p className="mt-1 text-slate-500 font-sans leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
