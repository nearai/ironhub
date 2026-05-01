import { getCategories, getMarketplaceCatalog } from "@/lib/catalog.server"
import { HubSidebar } from "./hub-sidebar"

type HubLayoutProps = {
  children: React.ReactNode
}

export async function HubLayout({ children }: HubLayoutProps) {
  const { items } = await getMarketplaceCatalog()

  return (
    <main className="flex">
      <HubSidebar items={items} categories={getCategories(items)} />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </main>
  )
}
