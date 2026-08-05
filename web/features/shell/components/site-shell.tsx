import { TopNav } from "./top-nav"
import { SiteFooter } from "./site-footer"
import { ScrollToTopButton } from "./scroll-to-top-button"

type SiteShellProps = {
  children: React.ReactNode
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip text-foreground">
      <TopNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <ScrollToTopButton />
    </div>
  )
}
