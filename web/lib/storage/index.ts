import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import {
  getStorageBucket,
  getStorageClient,
  getStoragePresignClient,
} from "./client.ts"

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType?: string
): Promise<void> {
  const client = getStorageClient()
  await client.send(
    new PutObjectCommand({
      Bucket: getStorageBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

export async function getObjectStream(key: string) {
  const client = getStorageClient()
  const result = await client.send(
    new GetObjectCommand({ Bucket: getStorageBucket(), Key: key })
  )
  if (!result.Body) {
    // NOTE: the "Object not found:" prefix is load-bearing -- the private
    // content read route (app/api/private-artifacts/[id]/content/[kind])
    // pattern-matches this exact prefix to tell a genuine absence from a
    // real storage failure. Rewording it drops that case to a 500 instead
    // of a 404, which fails safe (blocks saving rather than inviting an
    // overwrite), but keep it in sync if you do change it.
    throw new Error(`Object not found: ${key}`)
  }
  return result.Body
}

export async function deleteObject(key: string): Promise<void> {
  const client = getStorageClient()
  await client.send(
    new DeleteObjectCommand({ Bucket: getStorageBucket(), Key: key })
  )
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  const client = getStorageClient()
  const bucket = getStorageBucket()
  let continuationToken: string | undefined

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    const keys = (listed.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key))

    for (const key of keys) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined
  } while (continuationToken)
}

const MAX_PRESIGNED_TTL_SECONDS = 300

export async function getPresignedDownloadUrl(
  key: string,
  ttlSeconds: number = MAX_PRESIGNED_TTL_SECONDS
): Promise<string> {
  const client = getStoragePresignClient()
  const command = new GetObjectCommand({ Bucket: getStorageBucket(), Key: key })
  return getSignedUrl(client, command, {
    expiresIn: Math.min(ttlSeconds, MAX_PRESIGNED_TTL_SECONDS),
  })
}

export { getStorageBucket, getStoragePublicEndpoint } from "./client.ts"
