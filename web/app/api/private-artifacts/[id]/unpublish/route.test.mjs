import assert from "node:assert/strict"
import { mock, test } from "node:test"

let sameOriginThrows = null
const unpublishCalls = []

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
    unpublishPrivateArtifact: async (organizationId, id) => {
      unpublishCalls.push({ organizationId, id })
      return { id, status: "draft" }
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

test("unpublishes an artifact unconditionally and returns draft status", async () => {
  sameOriginThrows = null
  unpublishCalls.length = 0

  const response = await POST(postRequest(), makeParams())
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.equal(json.artifact.status, "draft")
  assert.equal(unpublishCalls.length, 1)
})

test("rejects cross-origin requests via the same-origin guard", async () => {
  sameOriginThrows = new Error("Cross-origin request blocked.")

  const response = await POST(postRequest(), makeParams())
  assert.equal(response.status, 400)
})
