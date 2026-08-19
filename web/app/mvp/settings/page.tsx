"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"
import {
  useMyOrganizations,
  useRenameOrganization,
} from "@/features/partner/api/orgs"
import { useToast } from "@/features/partner/store/toast-provider"
import {
  WorkspacePageHeader,
  FormSection,
  AttributeBadge,
} from "@/features/partner/components/ui"
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react"

export default function SettingsPage() {
  const { data: session } = authClient.useSession()
  const organizationId = session?.session.activeOrganizationId ?? undefined

  const { data: organizations, isError, error } = useMyOrganizations()
  const renameOrg = useRenameOrganization(organizationId ?? "")
  const { notify } = useToast()

  const activeOrg = organizations?.find((org) => org.id === organizationId)
  const isOwner = activeOrg?.role === "owner"

  const [name, setName] = useState("")
  // Guard so a background refetch (e.g. window focus) never clobbers an
  // in-progress edit — only reseed the form when we land on a new org.
  const seededOrgIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (activeOrg && seededOrgIdRef.current !== activeOrg.id) {
      seededOrgIdRef.current = activeOrg.id

      setName(activeOrg.name)
    }
  }, [activeOrg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner || !name.trim()) return
    try {
      await renameOrg.mutateAsync(name.trim())
      notify("Workspace name saved")
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not save the workspace name",
        "error"
      )
    }
  }

  const roleDescription =
    activeOrg?.role === "owner"
      ? "You can change everything, including this workspace's name and its members."
      : activeOrg?.role === "admin"
        ? "You can manage members and items."
        : "You can view and install items."

  const roleDisplay = activeOrg?.role
    ? activeOrg.role.charAt(0).toUpperCase() + activeOrg.role.slice(1)
    : "Member"

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Settings"
        description="Your workspace's name and who can change it."
      />

      {isError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>
            Could not load this workspace
            {error instanceof Error ? `: ${error.message}` : "."}
          </span>
        </div>
      )}

      <div className="space-y-6">
        <FormSection
          title="Workspace"
          description="How this workspace is named everywhere it appears."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="workspace-name"
                className="text-sm font-medium text-foreground"
              >
                Workspace name
              </label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
                className="h-11 max-w-md rounded-lg sm:h-10"
              />
              <p className="text-sm text-muted-foreground">
                This is the name shown in the workspace switcher and to everyone
                you invite.
              </p>
              {!isOwner && (
                <p className="text-sm text-muted-foreground">
                  Only the workspace owner can change this name.
                </p>
              )}
            </div>

            {isOwner && (
              <div className="flex flex-col-reverse border-t border-[var(--ironhub-line)] pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="submit"
                  disabled={renameOrg.isPending || !name.trim()}
                  className="h-11 w-full rounded-lg px-6 sm:h-10 sm:w-auto"
                >
                  {renameOrg.isPending && (
                    <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                  )}
                  Save name
                </Button>
              </div>
            )}
          </form>
        </FormSection>

        <FormSection
          title="Your access"
          description="What you can do in this workspace."
        >
          <div className="space-y-2">
            <div>
              <AttributeBadge>{roleDisplay}</AttributeBadge>
            </div>
            <p className="text-sm text-muted-foreground">{roleDescription}</p>
          </div>
        </FormSection>
      </div>
    </div>
  )
}
