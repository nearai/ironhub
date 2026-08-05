const DEFAULT_SITE_ORIGIN = "https://hub.ironclaw.com"

export const siteConfig = {
  name: "IronHub",
  tagline: "The Extension Hub for IronClaw",
  defaultTitle: "IronHub — The Extension Hub for IronClaw",
  description:
    "Discover and install IronClaw extensions, including repo-backed skills, WebAssembly tools, curated collections, and community use cases.",
  repository: "https://github.com/nearai/ironhub",
  locale: "en_US",
} as const

export function resolveSiteUrl(value?: string) {
  try {
    const url = new URL(value || DEFAULT_SITE_ORIGIN)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported site URL protocol")
    }

    return new URL(url.origin)
  } catch {
    return new URL(DEFAULT_SITE_ORIGIN)
  }
}

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_APP_URL)

export function absoluteUrl(path = "/", base: URL = siteUrl) {
  try {
    return new URL(path).toString()
  } catch {
    return new URL(path.startsWith("/") ? path : `/${path}`, base).toString()
  }
}
