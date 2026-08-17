import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { inspectExtensionBundle, readBundleFile } from "@/lib/private-artifacts/bundle"
import { storeArtifactContent } from "@/lib/private-artifacts/content"
import { getPrivateArtifact } from "@/lib/private-artifacts/service"

type Params = {
  params: Promise<{ id: string }>
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
      await storeArtifactContent(
        organizationId,
        id,
        "wasm",
        readBundleFile(zip, inspected.wasmPath)
      )
    )
    stored.push(
      await storeArtifactContent(
        organizationId,
        id,
        "capabilities",
        readBundleFile(zip, inspected.capabilitiesPath)
      )
    )
    stored.push(
      await storeArtifactContent(
        organizationId,
        id,
        "manifest_toml",
        readBundleFile(zip, "manifest.toml")
      )
    )
    stored.push(
      await storeArtifactContent(organizationId, id, "bundle_zip", zip)
    )

    return Response.json({ content: stored }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
