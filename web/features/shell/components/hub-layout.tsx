import { cn } from "@/lib/shared/utils"

type HubLayoutProps = {
  children: React.ReactNode
  fluid?: boolean
  className?: string
}

export function HubLayout({ children, fluid, className }: HubLayoutProps) {
  return (
    <div className="ih-home-wrapper">
      <main
        className={cn(
          fluid
            ? "relative z-10 w-full"
            : "ih-container relative z-10 pt-6 pb-7 sm:py-7",
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}
