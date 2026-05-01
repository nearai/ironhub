type HubLayoutProps = {
  children: React.ReactNode
}

export function HubLayout({ children }: HubLayoutProps) {
  return (
    <main className="px-4 py-7 sm:px-6 lg:px-8">
      {children}
    </main>
  )
}
