import assert from "node:assert/strict"
import { mock, test } from "node:test"

let checksResult = null
let checksError = null
const checksCalls = []

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
    handleApiError: (error) => {
      if (error instanceof Response) return error
      return Response.json({ error: String(error) }, { status: 400 })
    },
  },
})

mock.module("@/lib/private-artifacts/service", {
  namedExports: {
    getArtifactChecks: async (organizationId, id) => {
      checksCalls.push({ organizationId, id })
      if (checksError) throw checksError
      return checksResult
    },
  },
})

const { GET } = await import("./route.ts")

function makeParams(id = "artifact-1") {
  return { params: Promise.resolve({ id }) }
}

test("returns the checks and publishable flag verbatim from the service", async () => {
  checksError = null
  checksCalls.length = 0
  checksResult = {
    checks: [
      { id: "category_set", label: "Category set", status: "pass", detail: "ok" },
    ],
    publishable: true,
  }

  const response = await GET(new Request("http://localhost/x"), makeParams())
  const json = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(json, checksResult)
  assert.equal(checksCalls.length, 1)
  assert.equal(checksCalls[0].id, "artifact-1")
})

test("404s when the artifact does not belong to the caller's organization", async () => {
  checksError = new Response("Artifact not found", { status: 404 })

  const response = await GET(new Request("http://localhost/x"), makeParams())
  assert.equal(response.status, 404)
})
