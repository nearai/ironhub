"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/features/shell/components/page-header"
import { authClient } from "@/lib/auth/client"
import { useMyOrganizations, useOrgMembers, useRenameOrganization } from "@/features/partner/api/orgs"
import { useToast } from "@/features/partner/store/toast-provider"
import { IconBuildings, IconLoader2 } from "@tabler/icons-react"

export default function SettingsPage() {
  const { data: session } = authClient.useSession()
  const organizationId = session?.session.activeOrganizationId ?? undefined
  const currentUserId = session?.user.id

  const { data: organizations } = useMyOrganizations()
  const { data: members } = useOrgMembers(organizationId)
  const renameOrg = useRenameOrganization(organizationId ?? "")
  const { notify } = useToast()

  const activeOrg = organizations?.find((org) => org.id === organizationId)
  const currentMember = members?.find((m) => m.userId === currentUserId)
  const isOwner = currentMember?.role === "owner"

  const [name, setName] = useState("")

  useEffect(() => {
    if (activeOrg) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(activeOrg.name)
    }
  }, [activeOrg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner || !name.trim()) return
    try {
      await renameOrg.mutateAsync(name.trim())
      notify("Organization renamed")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to rename organization", "error")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Console Settings"
        title="Organization Settings"
        description="Manage your organization's identity."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconBuildings className="size-4 text-primary" />
            Organization Profile
          </h3>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Organization Space Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
                className="rounded-full bg-background/50 text-xs"
              />
              {!isOwner && (
                <p className="text-xs text-muted-foreground">
                  Only the organization owner can rename the workspace.
                </p>
              )}
            </div>

            {isOwner && (
              <Button
                type="submit"
                disabled={renameOrg.isPending || !name.trim()}
                className="self-start rounded-full text-xs"
              >
                {renameOrg.isPending && <IconLoader2 className="size-3.5 animate-spin" />}
                Save Name
              </Button>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}
