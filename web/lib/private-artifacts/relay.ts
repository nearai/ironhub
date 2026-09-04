// Reading stored artifact bytes back out as an HTTP response.
//
// Shared by the two private content read paths because they must agree on the
// awkward parts -- telling a genuinely absent object from a storage failure,
// and setting a length the caller can trust -- while deliberately disagreeing
// about whether a redirect is allowed at all. See the header on each route.
import { Readable } from "node:stream"

import { getObjectStream } from "@/lib/storage"

/**
 * True only for a genuine "the object does not exist" failure -- an S3
 * NoSuchKey/NotFound exception (matched by name or by the SDK's own
 * $metadata.httpStatusCode) or getObjectStream's own synthesized "Object
 * not found:" Error for a Body-less response. Anything else (timeouts,
 * throttling, expired credentials, a misconfigured bucket, a network
 * blip, ...) is a real infrastructure failure, not an absence, and MUST
 * NOT be answered as 404: the owner-facing client maps 404 to "nothing is
 * stored yet, safe to save a fresh file" (design.md D5 lane review B2). A
 * transient storage failure mapped to 404 would tell the owner their real
 * SKILL.md/capabilities.json doesn't exist and invite them to overwrite it
 * with a near-empty one -- the exact bug that route exists to prevent.
 */
export function isMissingObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === "NoSuchKey" || error.name === "NotFound") return true
  const metadata = (error as { $metadata?: { httpStatusCode?: number } })
    .$metadata
  if (metadata?.httpStatusCode === 404) return true
  return error.message.startsWith("Object not found:")
}

/**
 * Streams a stored object back as a `200`, with `Content-Length` taken from
 * the size recorded at write time rather than from anything the object store
 * reports now.
 *
 * That choice is the point of the function. The agent enforces the advertised
 * `size_bytes` and `sha256` exactly (C6), and the number it compares against
 * is the one this hub signed into the manifest -- which is the recorded size.
 * Serving a length from any other source would let the two disagree silently;
 * with this one, a body that no longer matches its row fails as a truncated
 * or overlong response instead of as a digest mismatch three artifacts later.
 *
 * No `Content-Encoding` is ever set, and no transform is applied. The agent's
 * HTTP client is built without gzip/brotli support, so it sends no
 * `Accept-Encoding` and cannot decode a compressed body (C6); an encoded
 * response would be counted and hashed as its compressed bytes.
 */
export async function relayStoredObject(content: {
  storageKey: string
  sizeBytes: number
  contentType: string
}): Promise<Response> {
  let stream: Awaited<ReturnType<typeof getObjectStream>>
  try {
    stream = await getObjectStream(content.storageKey)
  } catch (storageError) {
    if (isMissingObjectError(storageError)) {
      // The row exists but the object itself is genuinely gone from the
      // bucket (deleted out of band, bucket mismatch, ...) -- from the
      // caller's point of view this is the same "nothing to read" situation
      // as a missing row, so answer it the same way instead of reporting a
      // server fault for a data-integrity issue that isn't the caller's
      // problem to retry past.
      console.error(
        `Row exists but the object is missing from storage (key: ${content.storageKey}):`,
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
  const body = (stream instanceof Readable
    ? Readable.toWeb(stream)
    : stream) as unknown as ReadableStream

  return new Response(body, {
    status: 200,
    headers: relayHeaders(content.contentType, content.sizeBytes),
  })
}

/** The in-memory counterpart, for bytes the hub holds rather than stores. */
export function relayBytes(bytes: Uint8Array, contentType: string): Response {
  // Copied into a standalone ArrayBuffer rather than handed over directly:
  // `BodyInit` admits an `ArrayBuffer` but not a `Uint8Array` over the
  // `ArrayBufferLike` its default type parameter allows. A copy narrows that
  // without a cast, and every caller here is a handful of bytes.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)

  return new Response(buffer, {
    status: 200,
    headers: relayHeaders(contentType, bytes.byteLength),
  })
}

function relayHeaders(contentType: string, sizeBytes: number): Headers {
  return new Headers({
    "Content-Type": contentType,
    "Content-Length": String(sizeBytes),
    "Cache-Control": "no-store",
  })
}
