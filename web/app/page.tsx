import { HomeScreen } from "@/features/home/components/home-screen"
import { buildPublicMetadata } from "@/lib/discovery/metadata"
import { siteConfig } from "@/lib/discovery/site"

export const dynamic = "force-dynamic"

export const metadata = buildPublicMetadata({
  title: siteConfig.defaultTitle,
  description: siteConfig.description,
  path: "/",
  absoluteTitle: true,
  imageAlt: siteConfig.defaultTitle,
})

export default function Home() {
  return <HomeScreen />
}
