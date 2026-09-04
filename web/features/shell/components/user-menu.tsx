"use client"

import {
  IconBriefcase,
  IconChevronDown,
  IconHome2,
  IconLoader2,
  IconLogin2,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserClawAvatar } from "@/features/account/components/user-claw-avatar"
import { useAccountActions } from "@/features/account/hooks/use-account-actions"
import { displayIdentity } from "@/lib/orgs/near-identity"
import {
  isAccountRouteDisabled,
  isWorkspaceRouteDisabled,
} from "@/lib/shared/feature-flags"

/**
 * The header's account control (design D4/D5): a `DropdownMenu` triggered by
 * the member's avatar, offering IronHub, Private Space, and Account, plus
 * Sign out. When no member is signed in, this renders a sign-in action
 * instead -- there is no menu to open.
 */
export function UserMenu() {
  const { session, isPending, isSigningOut, signOut } = useAccountActions()

  if (isPending) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        disabled
        aria-label="Loading account"
        className="rounded-lg"
      >
        <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
      </Button>
    )
  }

  if (!session) {
    // design D5: for a signed-out visitor the cluster is theme + "Sign in".
    // Routing there is pointless if the account route itself is turned off
    // for this deployment -- the same reason a disabled menu entry is never
    // offered to a signed-in member.
    if (isAccountRouteDisabled) return null

    return (
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-10 rounded-lg"
      >
        <Link href="/account" aria-label="Sign in">
          <IconLogin2 className="size-4" aria-hidden="true" />
          <span>Sign in</span>
        </Link>
      </Button>
    )
  }

  const { user } = session
  const label = user.name || user.email || "Account"
  // Hides the `temp-…` placeholder better-near-auth mints for accounts it
  // cannot derive a stable address for; the name above it is the account id.
  const identity = displayIdentity(user.email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 gap-1.5 rounded-lg pr-2 pl-1.5"
          aria-label={`Account menu for ${label}`}
        >
          <UserClawAvatar
            user={user}
            // Requested at 2x the displayed 24px box (className below):
            // imageClassName zooms the source 2x for the crop framing, so
            // fetching at the displayed size would upscale it -- this keeps
            // the framing identical and only raises the source resolution.
            size={48}
            className="size-6 rounded-md"
            imageClassName="origin-top scale-[2] object-cover object-top p-0"
          />
          <IconChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {/* The member's full identity lives here, not in the trigger
            (design D4): there is room for it, and a NEAR account's address
            should never be the only thing the header shows. */}
        <div className="flex items-center gap-3 px-2 py-2">
          <UserClawAvatar
            user={user}
            // Same 2x-for-the-zoom reasoning as the trigger's avatar above.
            size={72}
            className="size-9"
            imageClassName="origin-top scale-[2] object-cover object-top p-0"
          />
          <div className="min-w-0">
            {/* The account control's trigger identifies by avatar alone; this
                is the one place the member's full identity is readable, so a
                long NEAR account (an implicit account is 64 hex characters)
                wraps here instead of being cut with an ellipsis. */}
            <p className="text-sm font-medium break-words [overflow-wrap:anywhere] text-foreground">
              {label}
            </p>
            {identity && identity !== label && (
              <p className="text-sm break-words [overflow-wrap:anywhere] text-muted-foreground">
                {identity}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/">
            <IconHome2 aria-hidden="true" />
            <span>IronHub</span>
          </Link>
        </DropdownMenuItem>

        {!isWorkspaceRouteDisabled && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <IconBriefcase aria-hidden="true" />
              <span>Private Space</span>
            </Link>
          </DropdownMenuItem>
        )}

        {!isAccountRouteDisabled && (
          <DropdownMenuItem asChild>
            <Link href="/account">
              <IconUserCircle aria-hidden="true" />
              <span>Account</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={() => {
            void signOut()
          }}
        >
          {isSigningOut ? (
            <IconLoader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <IconLogout aria-hidden="true" />
          )}
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
