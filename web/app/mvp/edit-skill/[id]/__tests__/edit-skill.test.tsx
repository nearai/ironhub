import { Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import EditSkillPage from "../page"

const BASE_ARTIFACT = {
  id: "skill-1",
  organizationId: "org1",
  createdById: "u1",
  type: "skill",
  name: "invoice-auditor",
  title: "Invoice Auditor",
  version: "1.0.0",
  visibility: "private",
  status: "draft",
  category: "Dev Tools",
  description: "Audits invoices.",
  sourceUrl: "https://github.com/acme/invoice-auditor",
  content: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

// `use(params)` suspends on first render since the params promise hasn't
// settled from React's perspective yet — same pattern as manage.test.tsx.
async function renderPage(id = "skill-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Suspense fallback={<div>Loading route...</div>}>
            <EditSkillPage params={Promise.resolve({ id })} />
          </Suspense>
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("edit-skill page — clearing the repository link", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends an explicit null, not an omitted key, when the repository link is cleared", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === "/api/private-artifacts/skill-1") {
        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify({ artifact: { ...BASE_ARTIFACT, sourceUrl: null } }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ artifact: BASE_ARTIFACT }), { status: 200 })
      }
      if (url === "/api/private-artifacts/skill-1/content/skill_md" && init?.method === "PUT") {
        return new Response(null, { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`)
    })

    await renderPage()

    const repoInput = await screen.findByPlaceholderText("https://github.com/org/repo")
    await waitFor(() => expect(repoInput).toHaveValue(BASE_ARTIFACT.sourceUrl))

    fireEvent.change(repoInput, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: /save & publish/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/mvp/manage/skill-1"))

    const patchCall = vi
      .mocked(fetch)
      .mock.calls.find(([, callInit]) => callInit?.method === "PATCH")
    expect(patchCall).toBeDefined()
    // JSON.stringify drops an `undefined` value entirely — this must be a
    // real `null` in the parsed body for the server to actually clear it.
    const body = JSON.parse(String(patchCall?.[1]?.body))
    expect(body).toHaveProperty("sourceUrl", null)
  })
})
