import { TopNav } from "./top-nav"

type SiteShellProps = {
  children: React.ReactNode
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <TopNav />
      {children}
    </div>
  )
}
