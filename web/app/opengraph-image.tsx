import {
  renderSocialCard,
  socialImageContentType,
  socialImageSize,
} from "@/lib/discovery/social-card"
import { siteConfig } from "@/lib/discovery/site"

export const alt = siteConfig.defaultTitle
export const size = socialImageSize
export const contentType = socialImageContentType

export default function OpenGraphImage() {
  return renderSocialCard({
    title: siteConfig.tagline,
    label: "IronHub Marketplace",
    description: siteConfig.description,
  })
}
