import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/marketplace.md",
        destination: "/api/markdown/marketplace",
      },
      {
        source: "/marketplace/:slug.md",
        destination: "/api/markdown/marketplace/:slug",
      },
      {
        source: "/usecases.md",
        destination: "/api/markdown/usecases",
      },
      {
        source: "/usecases/:id.md",
        destination: "/api/markdown/usecases/:id",
      },
      {
        source: "/collections/:slug.md",
        destination: "/api/markdown/collections/:slug",
      },
    ]
  },
}

export default nextConfig
