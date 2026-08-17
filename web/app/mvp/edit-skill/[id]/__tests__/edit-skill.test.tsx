import { act, Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
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

const artifact = {
  id: "artifact-1",
  organizationId: "org-1",
  createdById: null,
  type: "skill",
  name: "my-skill",
  title: "My Skill",
  version: "1.0.0",
  visibility: "private",
  status: "draft",
  description: "A skill.",
  sourceUrl: null,
  content: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

// EditSkillPage reads its `id` param via React's `use()`, which suspends at
// least once even for an already-resolved promise. testing-library's own
// act-wrapping doesn't flush that combined with the async react-query
// fetches, so render + the initial settle are wrapped in an explicit async
// act() here -- without it the tree stays stuck on the Suspense fallback.
async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  let result: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Suspense fallback={null}>
            <EditSkillPage params={Promise.resolve({ id: "artifact-1" })} />
          </Suspense>
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return result!
}

describe("edit-skill content load failure", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("disables saving and shows an error when the stored SKILL.md fails to load", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/skill_md") {
        return new Response(JSON.stringify({ error: "Content not found" }), {
          status: 404,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText(/could not load the stored skill\.md/i)).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save & publish/i })
    expect(saveButton).toBeDisabled()
  })

  it("seeds the body and known frontmatter fields, and enables saving once the file loads", async () => {
    const storedFile = [
      "---",
      "name: my-skill",
      "version: 1.0.0",
      "description: A skill.",
      "value_prop: Does the thing.",
      "use_cases:",
      "  - Automate onboarding",
      "custom_owner_note: keep me",
      "---",
      "",
      "## Persona",
      "",
      "Be helpful.",
    ].join("\n")

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/skill_md") {
        return new Response(storedFile, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save & publish/i })).not.toBeDisabled()
      expect(screen.getByDisplayValue("Does the thing.")).toBeInTheDocument()
    })
  })
})
