import { TopNav } from "./top-nav"
import { SiteFooter } from "./site-footer"

type SiteShellProps = {
  children: React.ReactNode
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip text-foreground">
      <TopNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
