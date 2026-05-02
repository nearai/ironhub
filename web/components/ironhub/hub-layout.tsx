type HubLayoutProps = {
  children: React.ReactNode
}

export function HubLayout({ children }: HubLayoutProps) {
  return (
    <div className="ih-home-wrapper">
      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-0 pb-7 sm:px-6 sm:py-7 lg:px-0">
        {children}
      </main>
      <img
        src="/ironclaw.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed right-0 bottom-0 z-0 h-auto w-[260px] opacity-70 select-none sm:w-[340px] lg:w-[480px]"
        style={{ filter: "drop-shadow(var(--ih-shadow))" }}
      />
    </div>
  )
}
