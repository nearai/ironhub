function isTrue(value: string | undefined) {
  return value === "true"
}

export const isAccountRouteDisabled = isTrue(
  process.env.NEXT_PUBLIC_DISABLE_ACCOUNT_ROUTE
)

export const isAgentsRouteDisabled = isTrue(
  process.env.NEXT_PUBLIC_DISABLE_AGENTS_ROUTE
)

// The env var keeps its `MVP` name even though the route it gates is now
// `/dashboard`: it is already set in deployed environments, and renaming it
// would silently un-hide the workspace wherever the new name isn't set.
export const isWorkspaceRouteDisabled = isTrue(
  process.env.NEXT_PUBLIC_DISABLE_MVP_ROUTE
)

export const isIliadEnabled = isTrue(process.env.NEXT_PUBLIC_ENABLE_ILIAD)

/**
 * "Install to Agent" cannot work today: the hub emits a deep link
 * (`{agentUrl}/#/install/{slug}?...`) that no surface on the IronClaw agent
 * consumes -- its WebUI is a `BrowserRouter` with no install route, and the
 * catch-all redirects to `/chat`. The signed payload is silently discarded
 * and the user sees nothing happen. This is filed upstream; until it lands,
 * the button must stay hidden, so this defaults to off (ENABLE, not
 * DISABLE) rather than shipping on by accident. Before deleting this flag,
 * re-verify the agent actually has a route that consumes the deep link.
 */
export const isAgentInstallEnabled = isTrue(
  process.env.NEXT_PUBLIC_ENABLE_AGENT_INSTALL
)
