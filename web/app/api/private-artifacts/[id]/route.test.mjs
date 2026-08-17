import assert from "node:assert/strict"
import { mock, test } from "node:test"

const updateCalls = []

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
    assertJsonMutationRequest: () => {},
    assertSameOriginRequest: () => {},
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 400 })
    },
    parseJsonObject: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Invalid JSON body.")
      }
      return value
    },
  },
})

// Real allow-list from service.ts — the route's "unknown/immutable field"
// rejection is only meaningful if it's checked against the real list, not a
// hand-rolled stand-in that could drift from what service.ts actually allows.
mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    MUTABLE_ARTIFACT_FIELDS: ["title", "description", "visibility", "sourceUrl", "category"],
    deletePrivateArtifact: async () => ({ id: "artifact-1" }),
    getPrivateArtifact: async () => ({ id: "artifact-1", organizationId: "org-1" }),
    updatePrivateArtifact: async (organizationId, id, patch) => {
      updateCalls.push({ organizationId, id, patch })
      return { id, organizationId, ...patch }
    },
  },
})

mock.module("@/lib/storage", {
  namedExports: {
    deleteByPrefix: async () => {},
  },
})

const { PATCH } = await import("./route.ts")

function makeParams() {
  return { params: Promise.resolve({ id: "artifact-1" }) }
}

function patchRequest(body) {
  return new Request("http://localhost/x", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

test("PATCH rejects a status field with 400 and does not touch the service", async () => {
  updateCalls.length = 0
  const response = await PATCH(patchRequest({ status: "published" }), makeParams())

  assert.equal(response.status, 400)
  assert.equal(updateCalls.length, 0)
})

test("PATCH rejects immutable fields (name, version, type) with 400", async () => {
  updateCalls.length = 0
  const response = await PATCH(patchRequest({ name: "renamed" }), makeParams())

  assert.equal(response.status, 400)
  assert.equal(updateCalls.length, 0)
})

test("PATCH forwards a valid category to the service and returns the updated artifact", async () => {
  updateCalls.length = 0
  const response = await PATCH(
    patchRequest({ category: "Automation" }),
    makeParams()
  )
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].patch.category, "Automation")
  assert.equal(json.artifact.category, "Automation")
})
