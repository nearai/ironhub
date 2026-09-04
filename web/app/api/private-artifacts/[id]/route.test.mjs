import assert from "node:assert/strict"
import { mock, test } from "node:test"

// Grab the real constant before mocking the module below, so the route's
// "unknown/immutable field" rejection is checked against what service.ts
// actually allows today. A hand-copied array literal here would silently
// drift from the real list — e.g. someone adds "status" to
// MUTABLE_ARTIFACT_FIELDS and this suite would keep passing against a
// stale copy that never had "status" in it.
const { MUTABLE_ARTIFACT_FIELDS: realMutableArtifactFields } = await import(
  "@/lib/private-artifacts/service"
)

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

mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    MUTABLE_ARTIFACT_FIELDS: realMutableArtifactFields,
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

test("the real MUTABLE_ARTIFACT_FIELDS allow-list excludes status", () => {
  // Guards the guard rail: this fails the moment someone widens the real
  // list to include "status", even if the PATCH-level test below were ever
  // weakened or bypassed.
  assert.ok(!realMutableArtifactFields.includes("status"))
})

test("PATCH rejects a status field with 400 and does not touch the service", async () => {
  updateCalls.length = 0
  const response = await PATCH(patchRequest({ status: "published" }), makeParams())

  assert.equal(response.status, 400)
  assert.equal(updateCalls.length, 0)
})

test("PATCH rejects immutable fields (name, type) with 400", async () => {
  updateCalls.length = 0
  const response = await PATCH(patchRequest({ name: "renamed" }), makeParams())

  assert.equal(response.status, 400)
  assert.equal(updateCalls.length, 0)
})

test("PATCH forwards a version to the service", async () => {
  // `version` used to sit alongside `name` and `type` in the rejection above.
  // It is mutable now, and the ordering and grammar rules that constrain it
  // belong to the service -- the route's job is only to hand it over as a
  // string.
  updateCalls.length = 0
  const response = await PATCH(patchRequest({ version: "1.1.0" }), makeParams())
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].patch.version, "1.1.0")
  assert.equal(json.artifact.version, "1.1.0")
})

test("PATCH rejects a non-string version before reaching the service", async () => {
  updateCalls.length = 0
  const response = await PATCH(patchRequest({ version: 2 }), makeParams())

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
