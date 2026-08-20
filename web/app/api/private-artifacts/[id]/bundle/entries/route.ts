import { requireActiveOrganization } from "@/lib/auth/org-context"
import { handleApiError } from "@/lib/http/api"
import { listBundleEntries } from "@/lib/private-artifacts/bundle"
import { getArtifactContentMetadata } from "@/lib/private-artifacts/content"
import { getObjectBytes } from "@/lib/storage"

type Params = {
  params: Promise<{ id: string }>
}

/**
 * The file listing of the package stored for this tool.
 *
 * Read from the archive on every request rather than recorded at upload
 * time: the listing is a property of the bytes in storage, and computing it
 * here means it can never drift from them the way a persisted copy could.
 * The cost is one object read per call, bounded by `bundle_zip`'s 25MB
 * upload cap, and only the central directory is parsed -- no entry is
 * inflated.
 *
 * 404 when no package is stored, which is the honest answer for a tool whose
 * bundle upload never completed; `getArtifactContentMetadata` scopes the
 * lookup to the caller's organization and answers the same 404 for another
 * org's artifact, so this route leaks no existence across orgs.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params

    const content = await getArtifactContentMetadata(
      organizationId,
      id,
      "bundle_zip"
    )
    const zip = await getObjectBytes(content.storageKey)

    return Response.json({ entries: listBundleEntries(zip) })
  } catch (error) {
    return handleApiError(error)
  }
}
