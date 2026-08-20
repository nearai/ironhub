"use client"

import {
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconDoorExit,
  IconPlus,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"
import { MAX_ORGANIZATIONS_PER_USER } from "@/lib/orgs/limits"
import { cn } from "@/lib/shared/utils"
import {
  useCreateOrganization,
  useLeaveOrganization,
  useMyOrganizations,
  useSetActiveOrganization,
} from "@/features/partner/api/orgs"
import { useToast } from "@/features/partner/store/toast-provider"
import { workspaceLinkTone } from "@/features/partner/components/ui"

export interface OrgSwitcherProps {
  className?: string
}

export function OrgSwitcher({ className }: OrgSwitcherProps = {}) {
  const { data: session } = authClient.useSession()
  const activeOrganizationId = session?.session.activeOrganizationId
  const { data: organizations, isLoading } = useMyOrganizations()
  const setActive = useSetActiveOrganization()
  const createOrg = useCreateOrganization()
  const leaveOrg = useLeaveOrganization()
  const { notify } = useToast()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")

  const activeOrg = organizations?.find(
    (org) => org.id === activeOrganizationId
  )
  // Organizations the member owns, i.e. the ones they created. Workspaces
  // they were invited into do not count against the creation limit, which is
  // enforced server-side in lib/orgs/limits.ts.
  const ownedCount = (organizations ?? []).filter(
    (org) => org.role === "owner"
  ).length
  const canCreateOrganization = ownedCount < MAX_ORGANIZATIONS_PER_USER

  const handleSetActive = async (organizationId: string) => {
    if (organizationId === activeOrganizationId) {
      setOpen(false)
      return
    }
    try {
      await setActive.mutateAsync(organizationId)
      notify("Organization switched")
      setOpen(false)
      router.refresh()
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Failed to switch organization",
        "error"
      )
    }
  }

  const handleCreate = async () => {
    if (!newOrgName.trim() || !canCreateOrganization) return
    try {
      const org = await createOrg.mutateAsync(newOrgName.trim())
      await setActive.mutateAsync(org.id)
      notify(`${newOrgName.trim()} created`)
      setNewOrgName("")
      setCreating(false)
      setOpen(false)
      router.refresh()
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Failed to create organization",
        "error"
      )
    }
  }

  const handleLeave = async (organizationId: string) => {
    const wasActive = organizationId === activeOrganizationId
    try {
      await leaveOrg.mutateAsync(organizationId)

      if (wasActive) {
        // The session's activeOrganizationId is cookie-cached for up to 30
        // days; if we don't repoint it at a remaining org right away, every
        // subsequent private-artifacts request 403s until the cookie
        // happens to expire. Repoint to the next available org, or prompt
        // to create one if none remain.
        const remaining = (organizations ?? []).filter(
          (org) => org.id !== organizationId
        )
        if (remaining.length > 0) {
          await setActive.mutateAsync(remaining[0].id)
        } else {
          notify(
            "You left your last organization — create a new one to continue.",
            "info"
          )
          setCreating(true)
          setOpen(true)
        }
      }

      notify("Organization left", "info")
      router.refresh()
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to leave organization",
        "error"
      )
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border border-[var(--ironhub-line)] bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40",
            className
          )}
        >
          <IconBuilding
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-left">
            {activeOrg?.name ||
              (isLoading ? "Loading..." : "Select organization")}
          </span>
          <IconChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>My organizations</DropdownMenuLabel>
        <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {organizations?.map((org) => (
            <div
              key={org.id}
              className="flex min-h-10 items-center justify-between gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
            >
              <button
                type="button"
                onClick={() => handleSetActive(org.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold text-foreground"
              >
                {org.id === activeOrganizationId ? (
                  <IconCheck
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0 truncate">{org.name}</span>
              </button>
              <button
                type="button"
                onClick={() => handleLeave(org.id)}
                aria-label={`Leave ${org.name}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <IconDoorExit className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {organizations?.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No organizations yet.
            </p>
          )}
        </div>

        <div className="mt-2 border-t border-[var(--ironhub-line)]/50 pt-2">
          {!canCreateOrganization ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              You have reached the maximum of {MAX_ORGANIZATIONS_PER_USER}{" "}
              organizations.
            </p>
          ) : creating ? (
            <div className="flex items-center gap-1.5 px-1">
              <Input
                autoFocus
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  // Keep every keystroke from being read as the menu's
                  // typeahead search (the underlying content root listens
                  // for character keys anywhere inside it).
                  e.stopPropagation()
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                placeholder="Organization name"
                className="h-10 rounded-lg text-sm"
              />
              <Button
                type="button"
                size="sm"
                className="h-10 rounded-lg text-sm"
                disabled={createOrg.isPending}
                onClick={handleCreate}
              >
                Create
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={cn(
                "flex h-10 w-full items-center gap-1.5 rounded-lg px-2 text-sm font-semibold hover:bg-primary/5",
                workspaceLinkTone
              )}
            >
              <IconPlus className="size-3.5" aria-hidden="true" />
              Create organization
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
