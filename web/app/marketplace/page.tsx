import { MarketplaceScreen } from "@/features/marketplace/components/marketplace-screen"
import { buildPublicMetadata } from "@/lib/discovery/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPublicMetadata({
  title: "IronClaw Skills and Tools",
  description:
    "Browse repo-backed IronClaw skills, WebAssembly tools, and public community skills with security boundaries visible before install.",
  path: "/marketplace",
  markdownPath: "/marketplace.md",
})

export default function MarketplacePage() {
  return <MarketplaceScreen />
}
