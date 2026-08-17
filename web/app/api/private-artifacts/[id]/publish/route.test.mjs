import assert from "node:assert/strict"
import { mock, test } from "node:test"

let sameOriginThrows = null
let publishResult = null
let publishError = null
const publishCalls = []

mock.module("@/lib/auth/org-context", {
  namedExports: {
    requireActiveOrganization: async () => ({
      organizationId: "org-1",
      userId: "user-1",
    }),
  },
})

mock.module("@/lib/http/api", {
  namedExports: {
    assertSameOriginRequest: () => {
      if (sameOriginThrows) throw sameOriginThrows
    },
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 400 })
    },
  },
})

mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    publishPrivateArtifact: async (organizationId, id) => {
      publishCalls.push({ organizationId, id })
      if (publishError) throw publishError
      return publishResult
    },
  },
})

const { POST } = await import("./route.ts")

function makeParams(id = "artifact-1") {
  return { params: Promise.resolve({ id }) }
}

function postRequest() {
  return new Request("http://localhost/x", { method: "POST" })
}

test("publishes a complete artifact and returns it", async () => {
  sameOriginThrows = null
  publishError = null
  publishCalls.length = 0
  publishResult = { id: "artifact-1", status: "published", category: "Dev Tools" }

  const response = await POST(postRequest(), makeParams())
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.equal(json.artifact.status, "published")
  assert.equal(publishCalls.length, 1)
  assert.equal(publishCalls[0].id, "artifact-1")
})

test("propagates a 409 when a publish precondition is unmet", async () => {
  sameOriginThrows = null
  publishError = new Response("Artifact cannot be published: category is not set", {
    status: 409,
  })

  const response = await POST(postRequest(), makeParams())
  assert.equal(response.status, 409)
})

test("rejects cross-origin requests via the same-origin guard", async () => {
  sameOriginThrows = new Error("Cross-origin request blocked.")
  publishError = null

  const response = await POST(postRequest(), makeParams())
  assert.equal(response.status, 400)
})
