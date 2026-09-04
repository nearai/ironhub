import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.nearcatalog.xyz",
  ],
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
  async redirects() {
    return [
      // The former workspace list address. Must be matched ahead of the
      // wildcard below, or it lands on /dashboard/dashboard instead of
      // /dashboard/catalog.
      {
        source: "/mvp/dashboard",
        destination: "/dashboard/catalog",
        permanent: true,
      },
      {
        source: "/mvp",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/mvp/:path*",
        destination: "/dashboard/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
