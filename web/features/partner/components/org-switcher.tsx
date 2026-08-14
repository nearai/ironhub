"use client"

import {
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconDoorExit,
  IconPlus,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"
import {
  useCreateOrganization,
  useLeaveOrganization,
  useMyOrganizations,
  useSetActiveOrganization,
} from "@/features/partner/api/orgs"
import { useToast } from "@/features/partner/store/toast-provider"

export function OrgSwitcher() {
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
  const containerRef = useRef<HTMLDivElement>(null)

  const activeOrg = organizations?.find((org) => org.id === activeOrganizationId)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSetActive = async (organizationId: string) => {
    if (organizationId === activeOrganizationId) {
      setOpen(false)
      return
    }
    try {
      await setActive.mutateAsync(organizationId)
      notify("Switched organization")
      setOpen(false)
      router.refresh()
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to switch organization", "error")
    }
  }

  const handleCreate = async () => {
    if (!newOrgName.trim()) return
    try {
      const org = await createOrg.mutateAsync(newOrgName.trim())
      await setActive.mutateAsync(org.id)
      notify(`Created organization ${newOrgName.trim()}`)
      setNewOrgName("")
      setCreating(false)
      setOpen(false)
      router.refresh()
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create organization", "error")
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
        const remaining = (organizations ?? []).filter((org) => org.id !== organizationId)
        if (remaining.length > 0) {
          await setActive.mutateAsync(remaining[0].id)
        } else {
          notify("You left your last organization — create a new one to continue.", "info")
          setCreating(true)
          setOpen(true)
        }
      }

      notify("Left organization", "info")
      router.refresh()
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to leave organization", "error")
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex items-center gap-1.5 rounded-lg text-sm font-semibold text-foreground hover:text-primary"
      >
        <IconBuilding className="size-3.5 text-muted-foreground shrink-0" />
        <span className="max-w-[9rem] truncate">
          {activeOrg?.name || (isLoading ? "Loading..." : "Select organization")}
        </span>
        <IconChevronDown className="size-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[var(--ironhub-line)] bg-popover p-2 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            My organizations
          </p>
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            {organizations?.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs hover:bg-muted/40"
              >
                <button
                  type="button"
                  onClick={() => handleSetActive(org.id)}
                  className="flex flex-1 items-center gap-2 truncate text-left font-semibold text-foreground"
                >
                  {org.id === activeOrganizationId ? (
                    <IconCheck className="size-3.5 shrink-0 text-primary" />
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{org.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLeave(org.id)}
                  aria-label={`Leave ${org.name}`}
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <IconDoorExit className="size-3.5" />
                </button>
              </div>
            ))}
            {organizations?.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">No organizations yet.</p>
            )}
          </div>

          <div className="mt-2 border-t border-[var(--ironhub-line)]/50 pt-2">
            {creating ? (
              <div className="flex items-center gap-1.5 px-1">
                <Input
                  autoFocus
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="h-8 rounded-full text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full text-xs"
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
                className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
              >
                <IconPlus className="size-3.5" />
                Create organization
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
