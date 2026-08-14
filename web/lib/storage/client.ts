import { S3Client } from "@aws-sdk/client-s3"

let cachedClient: S3Client | undefined
let cachedBucket: string | undefined
let cachedPublicEndpoint: string | undefined

function readEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

export function getStorageBucket(): string {
  if (!cachedBucket) {
    cachedBucket = readEnv("S3_BUCKET")
  }
  return cachedBucket
}

/**
 * Endpoint used to build presigned URLs. Defaults to S3_ENDPOINT but can be
 * overridden with S3_PUBLIC_ENDPOINT so presigned URLs remain reachable from
 * a host browser when the app itself talks to S3 over a container-internal
 * hostname (e.g. local dev stack).
 */
export function getStoragePublicEndpoint(): string {
  if (!cachedPublicEndpoint) {
    cachedPublicEndpoint =
      process.env.S3_PUBLIC_ENDPOINT ?? readEnv("S3_ENDPOINT")
  }
  return cachedPublicEndpoint
}

export function getStorageClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      endpoint: readEnv("S3_ENDPOINT"),
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: readEnv("S3_ACCESS_KEY"),
        secretAccessKey: readEnv("S3_SECRET_KEY"),
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    })
  }
  return cachedClient
}

/**
 * Returns a client configured with the public endpoint, used only for
 * presigned URL generation so the signed request matches the URL host the
 * browser will actually hit.
 */
export function getStoragePresignClient(): S3Client {
  return new S3Client({
    endpoint: getStoragePublicEndpoint(),
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: readEnv("S3_ACCESS_KEY"),
      secretAccessKey: readEnv("S3_SECRET_KEY"),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  })
}

/** Test-only helper to reset memoized client/config between test cases. */
export function __resetStorageClientForTests() {
  cachedClient = undefined
  cachedBucket = undefined
  cachedPublicEndpoint = undefined
}
