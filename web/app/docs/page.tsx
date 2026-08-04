import { DocsScreen } from "@/features/docs/components/docs-screen"
import { buildPublicMetadata } from "@/lib/discovery/metadata"

export const metadata = buildPublicMetadata({
  title: "Documentation",
  description:
    "Read the repository guides for IronClaw tools, skills, manifests, contribution flow, and release status.",
  path: "/docs",
})

export default function DocsPage() {
  return <DocsScreen />
}
