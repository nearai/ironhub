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
  IconBuildings,
  IconBolt,
  IconShieldLock,
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
  const { state, regenerateInstallToken, updateInviteDomains, notify } = usePartnerStore()
  const { orgName, contactEmail, installToken, inviteDomains } = state

  // Form states
  const [profileName, setProfileName] = useState(orgName)
  const [profileEmail, setProfileEmail] = useState(contactEmail)
  const [domainsInput, setDomainsInput] = useState(inviteDomains)

  // Copy status
  const [copiedToken, setCopiedToken] = useState(false)

  // Reveal token
  const [revealToken, setRevealToken] = useState(false)

  // Save invite domains
  const [isSavingDomains, setIsSavingDomains] = useState(false)

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(installToken)
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
      notify("Install token copied to clipboard", "info")
    } catch (e) {
      console.error("Failed to copy text:", e)
      notify("Copy failed — check clipboard permissions", "error")
    }
  }

  const handleSaveDomains = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingDomains(true)
    setTimeout(() => {
      updateInviteDomains(domainsInput)
      setIsSavingDomains(false)
      notify("Invitation whitelist domains updated")
    }, 500)
  }

  const handleRegenerateToken = () => {
    regenerateInstallToken()
    setRevealToken(true)
    notify("Private install token regenerated successfully")
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Console Settings"
        title="Organization Settings"
        description="Configure organization identifiers, whitelisted domains, and private agent install tokens."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Organization Profile & Whitelists */}
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
                  Organization Space Name
                </label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="rounded-full bg-background/50 text-xs"
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
                  className="rounded-full bg-background/50 text-xs"
                />
              </div>

              {/* WHitelist Domain Link */}
              <form onSubmit={handleSaveDomains} className="border-t border-[var(--ironhub-line)]/50 pt-4 flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Whitelisted Email Domains
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. @circle.com, @circle-partner.com"
                    value={domainsInput}
                    onChange={(e) => setDomainsInput(e.target.value)}
                    className="rounded-full flex-1 bg-background/50 text-sm"
                    required
                  />
                  <Button type="submit" size="sm" disabled={isSavingDomains} className="rounded-full text-sm">
                    {isSavingDomains ? "Saving..." : "Save Rules"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Restricts member invitations to these domains. Separate multiple domains with commas.
                </p>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Column: Security and Install Token */}
        <div className="flex flex-col gap-6">
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <IconShieldLock className="size-4 text-primary" />
              Private Install Token
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Use this private install token in your IronClaw config to authenticate your local developer environments. This allows members to pull and run private organization tools safely.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Space Connection Token
                </label>
                <div className="relative flex gap-2">
                  <Input
                    type={revealToken ? "text" : "password"}
                    readOnly
                    value={installToken}
                    className="font-mono text-sm pr-20 rounded-full bg-background/70"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRevealToken(!revealToken)}
                      className="h-8 w-8 rounded-full"
                    >
                      {revealToken ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyToken}
                      className="h-8 w-8 rounded-full"
                    >
                      {copiedToken ? (
                        <IconCheck className="size-4 text-emerald-600" />
                      ) : (
                        <IconCopy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Regenerate Token trigger */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start rounded-full text-xs"
                  >
                    <IconRefresh className="size-3" />
                    Regenerate Install Token
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Regenerate Space Install Token?</DialogTitle>
                    <DialogDescription>
                      The current token will stop working immediately. Any active IronClaw agents pulling private tools with the old token will lose catalog access until they are updated.
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
                        onClick={handleRegenerateToken}
                        className="flex-1 rounded-full animate-pulse"
                      >
                        Regenerate
                      </Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Access Policy Configuration */}
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <IconBolt className="size-4 text-primary" />
              Access Control & Invites
            </h3>

            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30 p-3 hover:bg-muted/10 cursor-pointer">
                <input
                  type="radio"
                  name="invitePolicy"
                  value="admin_only"
                  defaultChecked
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground">
                    Admin Only Invitations
                  </span>
                  <span className="text-xs text-muted-foreground leading-normal block mt-0.5">
                    Only organization Space Administrators can invite new members to the org.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30 p-3 hover:bg-muted/10 cursor-pointer">
                <input
                  type="radio"
                  name="invitePolicy"
                  value="any_member"
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground">
                    Allow Member Invitations
                  </span>
                  <span className="text-xs text-muted-foreground leading-normal block mt-0.5">
                    Any active member can invite additional coworkers from the whitelisted domains.
                  </span>
                </div>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
