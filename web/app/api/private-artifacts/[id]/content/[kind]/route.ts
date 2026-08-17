import { Readable } from "node:stream"

import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import {
  CONTENT_MEDIA_TYPES,
  getArtifactContentMetadata,
  parseContentKind,
  storeArtifactContent,
} from "@/lib/private-artifacts/content"
import { deletePrivateArtifactContentRow } from "@/lib/private-artifacts/service"
import {
  deleteObject,
  getObjectStream,
  getPresignedDownloadUrl,
} from "@/lib/storage"

type Params = {
  params: Promise<{ id: string; kind: string }>
}

const MAX_CONTENT_BYTES = 5 * 1024 * 1024
const PRESIGNED_URL_TTL_SECONDS = 300

// Kinds delivered as a 302 redirect to a short-lived presigned URL instead
// of being proxied through the Next server (design.md D4), so large blobs
// never round-trip through this process. Declared locally rather than in
// content.ts: `bundle_zip` is a kind another lane is adding to the kind
// table there, and a plain string Set works whether or not it exists yet.
const REDIRECT_CONTENT_KINDS = new Set<string>(["wasm", "bundle_zip"])

// True only for a genuine "the object does not exist" failure -- an S3
// NoSuchKey/NotFound exception (matched by name or by the SDK's own
// $metadata.httpStatusCode) or getObjectStream's own synthesized "Object
// not found:" Error for a Body-less response. Anything else (timeouts,
// throttling, expired credentials, a misconfigured bucket, a network
// blip, ...) is a real infrastructure failure, not an absence, and MUST
// NOT be answered as 404: the owner-facing client maps 404 to "nothing is
// stored yet, safe to save a fresh file" (design.md D5 lane review B2). A
// transient storage failure mapped to 404 would tell the owner their real
// SKILL.md/capabilities.json doesn't exist and invite them to overwrite it
// with a near-empty one -- the exact bug this route exists to prevent.
function isMissingObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === "NoSuchKey" || error.name === "NotFound") return true
  const metadata = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
  if (metadata?.httpStatusCode === 404) return true
  return error.message.startsWith("Object not found:")
}

// GET is the owner-facing read path (design.md D4): an active-org session is
// enough, no install token required, and there is no same-origin guard since
// GET is a safe method. `getArtifactContentMetadata` already scopes the
// lookup to the caller's organization and returns the same 404 for both
// "artifact isn't in this org" and "no content of this kind" -- that's
// intentional, it's what keeps this route from leaking artifact existence
// across orgs.
export async function GET(_request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    const content = await getArtifactContentMetadata(
      organizationId,
      id,
      contentKind
    )

    if (REDIRECT_CONTENT_KINDS.has(contentKind)) {
      const url = await getPresignedDownloadUrl(
        content.storageKey,
        PRESIGNED_URL_TTL_SECONDS
      )
      return new Response(null, {
        status: 302,
        headers: { Location: url, "Cache-Control": "no-store" },
      })
    }

    let stream: Awaited<ReturnType<typeof getObjectStream>>
    try {
      stream = await getObjectStream(content.storageKey)
    } catch (storageError) {
      if (isMissingObjectError(storageError)) {
        // The content row exists but the object itself is genuinely gone
        // from the bucket (deleted out of band, bucket mismatch, ...) --
        // from the caller's point of view this is the same "nothing to
        // read" situation as a missing content row, so answer it the same
        // way instead of reporting a server fault for a data-integrity
        // issue that isn't the caller's problem to retry past.
        console.error(
          `Content row exists but the object is missing from storage (key: ${content.storageKey}):`,
          storageError
        )
        throw new Response("Content not found", { status: 404 })
      }
      // A real storage failure, not an absence -- see isMissingObjectError.
      // Surface it as a failure so the client blocks saving instead of
      // treating this artifact as never having had content.
      console.error(
        `Failed to read stored content (key: ${content.storageKey}):`,
        storageError
      )
      throw new Response("Failed to read stored content", { status: 500 })
    }
    // `stream` is a Node Readable when using the SDK's default Node request
    // handler (the case for our S3-compatible dev/prod setup); the DOM
    // `ReadableStream`/`Blob` cases are for non-Node runtimes and are not
    // exercised here, but are handled defensively since the SDK's Body type
    // is a union across all of them.
    const body = (
      stream instanceof Readable ? Readable.toWeb(stream) : stream
    ) as unknown as ReadableStream

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_MEDIA_TYPES[contentKind],
        "Content-Length": String(content.sizeBytes),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    const bytes = Buffer.from(await request.arrayBuffer())
    if (bytes.length === 0) {
      throw new Response("Empty content body", { status: 400 })
    }
    if (bytes.length > MAX_CONTENT_BYTES) {
      throw new Response("Content exceeds the 5MB limit", { status: 413 })
    }

    const content = await storeArtifactContent(
      organizationId,
      id,
      contentKind,
      bytes
    )

    return Response.json({ content }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// integration note: this DELETE handler is additive next to the PUT above
// (which wt-storage is rewriting for S3-backed uploads) to minimize merge
// surface — it does not modify the PUT handler or content.ts.
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    await deletePrivateArtifactContentRow(organizationId, id, contentKind)

    try {
      await deleteObject(`private-artifacts/${organizationId}/${id}/${contentKind}`)
    } catch (storageError) {
      console.error(
        `Failed to delete storage object for artifact ${id} content ${contentKind}:`,
        storageError
      )
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
