"use client"

import React, { useState } from "react"
import { usePartnerStore, TeamMember } from "@/features/partner/store/partner-store"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/features/shell/components/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  IconUsers,
  IconHistory,
  IconMail,
  IconUserPlus,
  IconTrash,
} from "@tabler/icons-react"

export default function TeamPage() {
  const { state, inviteMember, removeMember, notify } = usePartnerStore()
  const { teamMembers, activities } = state

  // Invite form state
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Member")

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail) return

    // Simple email domain matching warning or checks if desired
    inviteMember(inviteName, inviteEmail, inviteRole)
    setInviteName("")
    setInviteEmail("")
    setInviteRole("Member")
    notify(`Sent invitation to ${inviteEmail}`)
  }

  const handleRemoveMember = (email: string) => {
    removeMember(email)
    notify(`Removed member ${email}`, "info")
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Organization"
        title="Members & Access"
        description="Invite coworkers, manage system roles, and view administrative audit logs."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sync Status / Team List Column */}
        <div className="flex flex-col gap-6 md:col-span-1">
          {/* Invite Form */}
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <IconUserPlus className="size-4 text-primary" />
              Invite Member
            </h3>

            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="e.g. Cameron Circle"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="rounded-full bg-background/50 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Email Address
                </label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. cameron@circle.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="rounded-full bg-background/50 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Access Role
                </label>
                <NativeSelect
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMember["role"])}
                  className="w-full rounded-full text-sm"
                >
                  <NativeSelectOption value="Member">Member (Read & Install)</NativeSelectOption>
                  <NativeSelectOption value="Editor">Editor (Add & Edit)</NativeSelectOption>
                  <NativeSelectOption value="Admin">Admin (Full Control)</NativeSelectOption>
                </NativeSelect>
              </div>

              <Button type="submit" className="w-full rounded-full text-xs mt-2">
                Send Invitation
              </Button>
            </form>
          </Card>

          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
              <IconUsers className="size-4 text-primary" />
              Active Invitation Rules
            </h3>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs mb-1">
              <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                Automatic Invite Filter
              </span>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">
                Allow invitations to addresses matching: <code className="font-mono text-foreground font-bold text-xs">@circle.com</code> (configured in Settings).
              </p>
            </div>
          </Card>
        </div>

        {/* Audit Log / Activity Log Column */}
        <div className="flex flex-col gap-6 md:col-span-2">
          {/* Members List */}
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <IconUsers className="size-4 text-primary" />
              Space Members ({teamMembers.length})
            </h3>

            <div className="flex flex-col gap-3">
              {teamMembers.map((member) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between rounded-xl border border-[var(--ironhub-line)]/30 bg-background/30 p-3 hover:bg-muted/10"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase shrink-0">
                      {member.name.slice(0, 2)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {member.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                        <IconMail className="size-3" />
                        {member.email}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                      {member.role}
                    </span>
                    <Badge className={`font-bold text-xs uppercase tracking-wider px-1.5 py-0 rounded-full border ${
                      member.status === "Active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {member.status}
                    </Badge>

                    {/* Disable removing the primary admin Cameron for demo purposes */}
                    {member.email !== "cameron@circle.com" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.email)}
                        className="h-7 w-7 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${member.name}`}
                      >
                        <IconTrash className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Audit Logs */}
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
              <IconHistory className="size-4 text-primary" />
              Activity Tracker (Audit Logs)
            </h3>

            <div className="overflow-hidden rounded-2xl border border-[var(--ironhub-line)]/50 bg-background/20">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--ironhub-line)]/50 bg-muted/30">
                      <th className="p-3 font-semibold text-muted-foreground">Time</th>
                      <th className="p-3 font-semibold text-muted-foreground">User</th>
                      <th className="p-3 font-semibold text-muted-foreground">Action & Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ironhub-line)]/30">
                    {activities.map((act) => (
                      <tr key={act.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{act.time}</td>
                        <td className="p-3 font-mono font-semibold text-foreground/80">{act.user}</td>
                        <td className="p-3 text-foreground leading-relaxed">
                          {act.action.includes("`") ? (
                            <span>
                              {act.action.split("`")[0]}
                              <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-bold text-primary">
                                {act.action.split("`")[1]}
                              </code>
                              {act.action.split("`")[2]}
                            </span>
                          ) : (
                            act.action
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
