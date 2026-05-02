type HubLayoutProps = {
  children: React.ReactNode
}

export function HubLayout({ children }: HubLayoutProps) {
  return (
    <div className="ih-home-wrapper">
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
