import { InsightsScreen } from "@/features/insights/components/insights-screen"
import { buildPublicMetadata } from "@/lib/discovery/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPublicMetadata({
  title: "Catalog Insights",
  description:
    "Review IronHub catalog signals for shipped skills, tool actions, credential requirements, and declared limits.",
  path: "/insights",
})

export default function InsightsPage() {
  return <InsightsScreen />
}
