import assert from "node:assert/strict"
import test from "node:test"

import {
  __resetStorageClientForTests,
  getStorageBucket,
  getStoragePublicEndpoint,
} from "./client.ts"

function withEnv(vars, fn) {
  const previous = {}
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key]
    if (vars[key] === undefined) delete process.env[key]
    else process.env[key] = vars[key]
  }
  try {
    return fn()
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
    __resetStorageClientForTests()
  }
}

test("getStorageBucket reads S3_BUCKET", () => {
  withEnv({ S3_BUCKET: "my-bucket" }, () => {
    assert.equal(getStorageBucket(), "my-bucket")
  })
})

test("getStorageBucket throws when S3_BUCKET is unset", () => {
  withEnv({ S3_BUCKET: undefined }, () => {
    assert.throws(() => getStorageBucket(), /S3_BUCKET is not set/)
  })
})

test("getStoragePublicEndpoint defaults to S3_ENDPOINT", () => {
  withEnv({ S3_ENDPOINT: "http://internal:8333", S3_PUBLIC_ENDPOINT: undefined }, () => {
    assert.equal(getStoragePublicEndpoint(), "http://internal:8333")
  })
})

test("getStoragePublicEndpoint prefers S3_PUBLIC_ENDPOINT override", () => {
  withEnv(
    {
      S3_ENDPOINT: "http://internal:8333",
      S3_PUBLIC_ENDPOINT: "http://localhost:8333",
    },
    () => {
      assert.equal(getStoragePublicEndpoint(), "http://localhost:8333")
    }
  )
})
