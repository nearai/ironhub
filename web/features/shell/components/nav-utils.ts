export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isWorkspaceRoute(pathname: string | null | undefined) {
  if (!pathname) return false

  return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
}
