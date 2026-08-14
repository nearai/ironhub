import assert from "node:assert/strict"
import { mock, test } from "node:test"

process.env.S3_ENDPOINT = "http://localhost:8333"
process.env.S3_BUCKET = "ironhub"
process.env.S3_ACCESS_KEY = "test"
process.env.S3_SECRET_KEY = "test"
process.env.S3_FORCE_PATH_STYLE = "true"

const sentCommands = []

class FakeS3Client {
  async send(command) {
    sentCommands.push(command)
    const name = command.constructor.name
    if (name === "ListObjectsV2Command") {
      if (!command.input.ContinuationToken) {
        return {
          Contents: [{ Key: "private-artifacts/org-1/artifact-1/wasm" }],
          IsTruncated: true,
          NextContinuationToken: "page-2",
        }
      }
      return {
        Contents: [{ Key: "private-artifacts/org-1/artifact-1/capabilities" }],
        IsTruncated: false,
      }
    }
    if (name === "GetObjectCommand") {
      return { Body: new Uint8Array([1, 2, 3]) }
    }
    return {}
  }
}

mock.module("@aws-sdk/client-s3", {
  namedExports: {
    S3Client: FakeS3Client,
    PutObjectCommand: class PutObjectCommand {
      constructor(input) {
        this.input = input
      }
    },
    GetObjectCommand: class GetObjectCommand {
      constructor(input) {
        this.input = input
      }
    },
    DeleteObjectCommand: class DeleteObjectCommand {
      constructor(input) {
        this.input = input
      }
    },
    ListObjectsV2Command: class ListObjectsV2Command {
      constructor(input) {
        this.input = input
      }
    },
  },
})

mock.module("@aws-sdk/s3-request-presigner", {
  namedExports: {
    getSignedUrl: async (_client, command, options) => {
      return `https://example.test/${command.input.Key}?ttl=${options.expiresIn}`
    },
  },
})

const {
  deleteByPrefix,
  deleteObject,
  getObjectStream,
  getPresignedDownloadUrl,
  putObject,
} = await import("./index.ts")

test("putObject sends a PutObjectCommand with the bucket, key, and body", async () => {
  sentCommands.length = 0
  await putObject("private-artifacts/org-1/artifact-1/wasm", new Uint8Array([9]), "application/wasm")

  const put = sentCommands.find((c) => c.constructor.name === "PutObjectCommand")
  assert.ok(put)
  assert.equal(put.input.Bucket, "ironhub")
  assert.equal(put.input.Key, "private-artifacts/org-1/artifact-1/wasm")
  assert.equal(put.input.ContentType, "application/wasm")
})

test("getObjectStream returns the response body", async () => {
  const body = await getObjectStream("private-artifacts/org-1/artifact-1/wasm")
  assert.deepEqual(Array.from(body), [1, 2, 3])
})

test("deleteObject sends a DeleteObjectCommand for the key", async () => {
  sentCommands.length = 0
  await deleteObject("private-artifacts/org-1/artifact-1/wasm")

  const del = sentCommands.find((c) => c.constructor.name === "DeleteObjectCommand")
  assert.ok(del)
  assert.equal(del.input.Key, "private-artifacts/org-1/artifact-1/wasm")
})

test("deleteByPrefix paginates ListObjectsV2 and deletes every listed key", async () => {
  sentCommands.length = 0
  await deleteByPrefix("private-artifacts/org-1/artifact-1/")

  const lists = sentCommands.filter((c) => c.constructor.name === "ListObjectsV2Command")
  const deletes = sentCommands.filter((c) => c.constructor.name === "DeleteObjectCommand")

  assert.equal(lists.length, 2)
  assert.equal(lists[1].input.ContinuationToken, "page-2")
  assert.deepEqual(
    deletes.map((d) => d.input.Key).sort(),
    [
      "private-artifacts/org-1/artifact-1/capabilities",
      "private-artifacts/org-1/artifact-1/wasm",
    ]
  )
})

test("getPresignedDownloadUrl caps TTL at 5 minutes even if a longer TTL is requested", async () => {
  const url = await getPresignedDownloadUrl("private-artifacts/org-1/artifact-1/wasm", 3600)
  assert.match(url, /ttl=300$/)
})

test("getPresignedDownloadUrl passes through shorter TTLs unchanged", async () => {
  const url = await getPresignedDownloadUrl("private-artifacts/org-1/artifact-1/wasm", 60)
  assert.match(url, /ttl=60$/)
})
