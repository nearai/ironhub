// Smoke test for the S3-backed storage lib against the local dev stack.
//
// Usage: pnpm storage:smoke
//
// Loads .env first (like the app does), then falls back to the dev-stack
// defaults: S3 gateway at S3_ENDPOINT (default http://localhost:8334) and
// bucket S3_BUCKET (default "ironhub"). Exercises put/get/delete plus a presigned
// download URL fetched exactly as a browser would (over HTTP, no SDK).

import "dotenv/config"

process.env.S3_ENDPOINT ??= "http://localhost:8334"
process.env.S3_PUBLIC_ENDPOINT ??= process.env.S3_ENDPOINT
process.env.S3_BUCKET ??= "ironhub"
process.env.S3_REGION ??= "us-east-1"
process.env.S3_ACCESS_KEY ??= "ironhub"
process.env.S3_SECRET_KEY ??= "ironhub-local-secret"
process.env.S3_FORCE_PATH_STYLE ??= "true"

import {
  deleteObject,
  getObjectStream,
  getPresignedDownloadUrl,
  putObject,
} from "../lib/storage/index.ts"

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream)
  }
  if (
    stream &&
    typeof stream === "object" &&
    "transformToByteArray" in stream &&
    typeof (stream as { transformToByteArray: unknown })
      .transformToByteArray === "function"
  ) {
    const bytes = await (
      stream as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray()
    return Buffer.from(bytes)
  }
  throw new Error("Unsupported stream type returned by getObjectStream")
}

async function main() {
  const key = `smoke-test/${Date.now()}.txt`
  const payload = Buffer.from(
    `storage smoke test at ${new Date().toISOString()}`
  )

  console.log(`[1/4] putObject ${key}`)
  await putObject(key, payload, "text/plain")

  console.log("[2/4] getObjectStream + verify body")
  const body = await getObjectStream(key)
  const downloaded = await streamToBuffer(body)
  if (!downloaded.equals(payload)) {
    throw new Error("Downloaded object bytes do not match uploaded payload")
  }
  console.log("    OK: bytes match")

  console.log("[3/4] getPresignedDownloadUrl + fetch over HTTP")
  const url = await getPresignedDownloadUrl(key, 60)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Presigned URL fetch failed: ${response.status}`)
  }
  const fetched = Buffer.from(await response.arrayBuffer())
  if (!fetched.equals(payload)) {
    throw new Error("Presigned URL fetch bytes do not match uploaded payload")
  }
  console.log("    OK: presigned URL served correct bytes")

  console.log(`[4/4] deleteObject ${key}`)
  await deleteObject(key)

  console.log("Storage smoke test passed.")
}

main().catch((error) => {
  console.error("Storage smoke test failed:", error)
  process.exitCode = 1
})
