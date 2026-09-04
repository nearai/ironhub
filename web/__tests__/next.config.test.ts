import { describe, expect, it } from "vitest"

import nextConfig from "@/next.config"

describe("next.config redirects", () => {
  it("resolves /mvp/dashboard to /dashboard/catalog, ordered ahead of the /mvp/:path* wildcard", async () => {
    const redirects = await nextConfig.redirects!()

    const explicitIndex = redirects.findIndex(
      (redirect) => redirect.source === "/mvp/dashboard"
    )
    const wildcardIndex = redirects.findIndex(
      (redirect) => redirect.source === "/mvp/:path*"
    )

    // Both rules must exist...
    expect(explicitIndex).toBeGreaterThanOrEqual(0)
    expect(wildcardIndex).toBeGreaterThanOrEqual(0)

    // ...and the explicit /mvp/dashboard rule must be matched first, or the
    // wildcard would rewrite it to /dashboard/dashboard instead (design D2).
    expect(explicitIndex).toBeLessThan(wildcardIndex)
    expect(redirects[explicitIndex]).toMatchObject({
      source: "/mvp/dashboard",
      destination: "/dashboard/catalog",
      permanent: true,
    })

    // The wildcard itself must not turn /mvp/dashboard into /dashboard/dashboard.
    expect(redirects[wildcardIndex]).toMatchObject({
      source: "/mvp/:path*",
      destination: "/dashboard/:path*",
      permanent: true,
    })
  })

  it("redirects the bare /mvp prefix to /dashboard", async () => {
    const redirects = await nextConfig.redirects!()

    const bareIndex = redirects.findIndex((redirect) => redirect.source === "/mvp")
    const wildcardIndex = redirects.findIndex(
      (redirect) => redirect.source === "/mvp/:path*"
    )

    expect(bareIndex).toBeGreaterThanOrEqual(0)
    expect(redirects[bareIndex]).toMatchObject({
      source: "/mvp",
      destination: "/dashboard",
      permanent: true,
    })
    // Both rules match a bare "/mvp" request -- ":path*" matches zero
    // segments, and the slash before it sits inside the optional group -- so
    // whichever comes first wins. Ordering is not asserted because both
    // destinations resolve to the same place.
    expect(wildcardIndex).toBeGreaterThanOrEqual(0)
  })
})
