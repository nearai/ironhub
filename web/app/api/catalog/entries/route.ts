import { NextResponse } from "next/server"

import { requireActiveOrganization } from "@/lib/auth/org-context"
import { handleApiError } from "@/lib/http/api"
import { buildCollectionBundles } from "@/lib/catalog/collections"
import { getMarketplaceCatalog } from "@/lib/catalog/server"
import type { CatalogItem } from "@/lib/catalog/types"

/**
 * The verified public marketplace entries a loadout may take as members, plus
 * the curated bundles that expand into them.
 *
 * The marketplace catalog is assembled server-side from the IronHub release
 * and the Iliad backend, and every other reader of it is a server component.
 * The loadout member picker is not: it lives inside the workspace's client-
 * rendered manage screen, beside the organization's own artifacts, so it needs
 * the same list over HTTP. Nothing here is private -- these are the same
 * entries `/marketplace` already serves to anyone.
 *
 * Only `live` entries are offered. Membership is restricted to verified
 * entries, and that restriction is what makes resolving a public member live
 * -- rather than copying its bytes -- a defensible trade (design.md --
 * "Public members resolve live; no bytes are copied").
 *
 * Session-gated despite carrying nothing private. `getMarketplaceCatalog`
 * reads the repo and fans out across the Iliad backend on every call with no
 * cache of its own, so an uncached anonymous route in front of it is an
 * amplifier: one cheap request here becomes a page-through of every category
 * upstream. The other readers of this catalog are server components behind
 * Next's own caching; this one is not, so the gate does the same job. It costs
 * nothing real -- the only caller is the member picker, which lives inside the
 * workspace and already has a session.
 */
export const dynamic = "force-dynamic"

type PublicCandidate = {
  slug: string
  kind: "tool" | "skill"
  title: string
  version: string
  description: string | null
  category: string | null
}

function toCandidate(item: CatalogItem): PublicCandidate {
  return {
    slug: item.slug,
    kind: item.kind,
    title: item.name,
    version: item.version,
    description: item.description,
    category: item.category ?? null,
  }
}

export async function GET() {
  try {
    await requireActiveOrganization()

    const { items } = await getMarketplaceCatalog()
    const verified = items.filter((item) => item.status === "live")

    return NextResponse.json(
      {
        entries: verified.map(toCandidate),
        // Built over the verified set, so a bundle can never expand into an
        // entry the picker would refuse on its own.
        collections: buildCollectionBundles(verified).map((bundle) => ({
          slug: bundle.slug,
          title: bundle.title,
          summary: bundle.summary,
          items: bundle.items.map(toCandidate),
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    // `requireActiveOrganization` refuses by throwing a Response that already
    // carries its own status and body, so that is what an authentication or
    // organization failure looks like here. Anything else reaching this point
    // came out of the catalog read, which is an upstream failure rather than a
    // caller's mistake -- hence 502 rather than the generic 400 `jsonError`
    // would produce.
    if (error instanceof Response) return handleApiError(error)

    return NextResponse.json(
      { error: "Unable to read the public catalog." },
      { status: 502 }
    )
  }
}
