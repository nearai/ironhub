import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

let pathname = "/dashboard/catalog"
let searchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { ARTIFACT_TYPES } from "@/lib/private-artifacts/artifact-types"

import { PartnerNav } from "../partner-nav"

function renderNav(at = "/dashboard/catalog", query = "") {
  pathname = at
  searchParams = new URLSearchParams(query)
  return render(<PartnerNav />)
}

describe("PartnerNav catalog sub-items", () => {
  it("renders one sub-item per supported artifact type, derived from the type list", () => {
    renderNav()

    const subItems = screen.getAllByRole("listitem")
    // Derived, not written out: this is the assertion that a type added to
    // ARTIFACT_TYPES appears in the navigation without a second edit.
    expect(subItems).toHaveLength(ARTIFACT_TYPES.length)
    for (const type of ARTIFACT_TYPES) {
      const link = screen.getByRole("link", {
        name: new RegExp(`^${type}s$`, "i"),
      })
      expect(link).toHaveAttribute("href", `/dashboard/catalog?type=${type}`)
    }
  })

  it("includes Souls among them", () => {
    renderNav()

    expect(screen.getByRole("link", { name: "Souls" })).toHaveAttribute(
      "href",
      "/dashboard/catalog?type=soul"
    )
  })

  it("marks the sub-item the URL names as the current page", () => {
    renderNav("/dashboard/catalog", "type=soul")

    expect(screen.getByRole("link", { name: "Souls" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "Skills" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("marks no sub-item when the catalog carries no type", () => {
    renderNav("/dashboard/catalog")

    for (const type of ARTIFACT_TYPES) {
      expect(
        screen.getByRole("link", { name: new RegExp(`^${type}s$`, "i") })
      ).not.toHaveAttribute("aria-current")
    }
  })

  it("marks no sub-item on an item's manage page, where no list is filtered", () => {
    renderNav("/dashboard/manage/art-1", "type=soul")

    const list = screen.getByRole("list")
    for (const link of within(list).getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current")
    }
  })
})
