type HubLayoutProps = {
  children: React.ReactNode
  fluid?: boolean
}

export function HubLayout({ children, fluid }: HubLayoutProps) {
  return (
    <div className="ih-home-wrapper">
      <main
        className={
          fluid
            ? "relative z-10 w-full"
            : "ih-container relative z-10 pt-6 pb-7 sm:py-7"
        }
      >
        {children}
      </main>
    </div>
  )
}
