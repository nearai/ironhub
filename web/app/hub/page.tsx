import { HubScreen } from "@/features/hub/components/hub-screen"
import { buildPrivateMetadata } from "@/lib/discovery/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPrivateMetadata("My Hub")

export default function MyHubPage() {
  return <HubScreen />
}
