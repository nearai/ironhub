function isTrue(value: string | undefined) {
  return value === "true"
}

export const isAccountRouteDisabled = isTrue(
  process.env.NEXT_PUBLIC_DISABLE_ACCOUNT_ROUTE,
)

export const isAgentsRouteDisabled = isTrue(
  process.env.NEXT_PUBLIC_DISABLE_AGENTS_ROUTE,
)

export const isMvpRouteDisabled = isTrue(
  process.env.NEXT_PUBLIC_DISABLE_MVP_ROUTE,
)
