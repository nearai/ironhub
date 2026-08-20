import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/discovery/site"

const privatePaths = [
  "/account",
  "/hub",
  "/dashboard",
  "/api/auth",
  "/api/agent-installations",
  "/api/install-intents",
  "/api/private-artifacts",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  }
}
