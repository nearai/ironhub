import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { inspectExtensionBundle, readBundleFile } from "@/lib/private-artifacts/bundle"
import {
  type ContentKind,
  storeArtifactContent,
} from "@/lib/private-artifacts/content"
import { getPrivateArtifact } from "@/lib/private-artifacts/service"

type Params = {
  params: Promise<{ id: string }>
}

// `storeArtifactContent` (content.ts) is the authoritative D3 size guard --
// it applies to every caller, so a bundle can never smuggle a kind past its
// limit just because bundle.ts's own per-entry cap (D6) is looser (e.g. a
// 10MB wasm module in an archive well under the 25MB compressed cap, against
// D3's 5MB wasm limit). It throws a generic 413 shaped for a direct content
// upload, though. Here the "request" wasn't oversized -- one file inside the
// author's archive was -- so we re-shape that into a 400 naming the specific
// path, which is what the author needs to go fix.
async function storeBundleContent(
  organizationId: string,
  artifactId: string,
  kind: ContentKind,
  path: string,
  bytes: Uint8Array
) {
  try {
    return await storeArtifactContent(organizationId, artifactId, kind, bytes)
  } catch (error) {
    if (error instanceof Response && error.status === 413) {
      const detail = await error.text()
      throw new Response(`${path}: ${detail}`, { status: 400 })
    }
    throw error
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id } = await params

    // Org-scoped lookup: 404 (not 403) on cross-org access, matching the
    // other `[id]` routes -- existence of another org's artifact is not
    // leaked.
    const artifact = await getPrivateArtifact(organizationId, id)
    if (artifact.type !== "tool") {
      throw new Response("Bundle upload is only supported for tools", {
        status: 409,
      })
    }

    const zip = new Uint8Array(await request.arrayBuffer())

    // Never trust the inspect step: re-validate the archive from scratch on
    // every upload, since the bytes here may differ from whatever was
    // inspected earlier.
    const inspected = inspectExtensionBundle(zip)

    const stored = []
    stored.push(
      await storeBundleContent(
        organizationId,
        id,
        "wasm",
        inspected.wasmPath,
        readBundleFile(zip, inspected.wasmPath)
      )
    )
    stored.push(
      await storeBundleContent(
        organizationId,
        id,
        "capabilities",
        inspected.capabilitiesPath,
        readBundleFile(zip, inspected.capabilitiesPath)
      )
    )
    stored.push(
      await storeBundleContent(
        organizationId,
        id,
        "manifest_toml",
        "manifest.toml",
        readBundleFile(zip, "manifest.toml")
      )
    )
    stored.push(
      await storeBundleContent(
        organizationId,
        id,
        "bundle_zip",
        "the uploaded archive",
        zip
      )
    )

    return Response.json({ content: stored }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
