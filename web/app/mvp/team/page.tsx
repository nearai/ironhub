"use client"

import React from "react"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/features/shell/components/page-header"
import {
  IconUsers,
  IconHistory,
  IconBrandGithub,
} from "@tabler/icons-react"

export default function TeamPage() {
  const { state } = usePartnerStore()
  const { teamMembers, activities, githubOrg } = state

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Organization"
        title="Team Members & Activity"
        description="View synced credentials, team lists, and audit action logs for the organization."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sync Status / Team List Column */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
              <IconUsers className="size-4 text-primary" />
              Synced Members
            </h3>

            {githubOrg ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs mb-4">
                <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  GitHub Sync Enabled
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Importing users dynamically from the GitHub Organization: <span className="font-mono text-foreground">{githubOrg}</span>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs mb-4">
                <span className="font-semibold text-amber-600 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  Sync Suspended
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Link your organization GitHub in the Settings panel to enable dynamic role syncing.
                </p>
              </div>
            )}

            {/* Members List */}
            <div className="flex flex-col gap-3">
              {teamMembers.map((member) => (
                <div
                  key={member.githubHandle}
                  className="flex items-center justify-between rounded-xl border border-[var(--ironhub-line)]/30 bg-background/30 p-3 hover:bg-muted/10"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                      {member.name.slice(0, 2)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {member.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5 mt-0.5">
                        <IconBrandGithub className="size-3" />
                        {member.githubHandle}
                      </span>
                    </div>
                  </div>
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Audit Log / Activity Log Column */}
        <div className="flex flex-col gap-6 md:col-span-2">
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
                              <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
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
