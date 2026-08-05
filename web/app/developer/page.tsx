import { DeveloperScreen } from "@/features/developer/components/developer-screen"
import { buildPublicMetadata } from "@/lib/discovery/metadata"

export const metadata = buildPublicMetadata({
  title: "Build IronClaw Skills and Tools",
  description:
    "Contribute repo-backed IronClaw skills and WebAssembly tools with declared permissions, auth scopes, limits, and release checks.",
  path: "/developer",
})

export default function DeveloperPage() {
  return <DeveloperScreen />
}
