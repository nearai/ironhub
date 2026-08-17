import { act, Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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

const storedFileWithUnknownKey = [
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

describe("edit-skill content loading", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("disables saving and shows an error when the stored SKILL.md fails to load (500)", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/skill_md") {
        return new Response(JSON.stringify({ error: "Internal error" }), {
          status: 500,
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

  it("treats a 404 (no content row yet) as a safe empty state, not a load failure -- saving stays enabled", async () => {
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
      expect(screen.queryByText(/could not load the stored skill\.md/i)).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /save & publish/i })).not.toBeDisabled()
    })

    // Nothing was ever stored -- the body textarea starts empty, not an
    // error state, so the owner can create the file from here.
    const bodyField = screen.getByPlaceholderText(/describe how the agent should act/i)
    expect(bodyField).toHaveValue("")
  })

  it("seeds the body and known frontmatter fields, and enables saving once the file loads", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/skill_md") {
        return new Response(storedFileWithUnknownKey, {
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

  // This is the test that actually guards the bug this lane exists to fix:
  // editing one known field and saving must not drop a frontmatter key the
  // form doesn't expose. Deleting the `...baseFrontmatter,` spread in
  // page.tsx's buildFrontmatter() -- i.e. reintroducing the original bug --
  // must fail this test.
  it("preserves an unknown frontmatter key in the uploaded bytes after editing a known field and saving", async () => {
    const putCalls: Array<{ url: string; body: Blob }> = []

    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === "/api/private-artifacts/artifact-1" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/skill_md" && init?.method !== "PUT") {
        return new Response(storedFileWithUnknownKey, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        })
      }
      if (url === "/api/private-artifacts/artifact-1" && init?.method === "PATCH") {
        return new Response(JSON.stringify({ artifact }), { status: 200 })
      }
      if (url === "/api/private-artifacts/artifact-1/content/skill_md" && init?.method === "PUT") {
        putCalls.push({ url, body: init.body as Blob })
        return new Response(JSON.stringify({ content: { kind: "skill_md" } }), { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save & publish/i })).not.toBeDisabled()
    })

    // Edit only a known field -- description -- leaving `custom_owner_note`
    // untouched, exactly the scenario D5's binding rule covers.
    const descriptionField = screen.getByDisplayValue("A skill.")
    fireEvent.change(descriptionField, { target: { value: "An updated skill description." } })

    fireEvent.click(screen.getByRole("button", { name: /save & publish/i }))

    await waitFor(() => {
      expect(putCalls.length).toBe(1)
    })

    // jsdom's Blob has no working .text()/Response(blob).text() path;
    // FileReader is the one API jsdom implements fully for reading a
    // Blob's contents back out in a test environment.
    const uploadedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(putCalls[0].body)
    })
    expect(uploadedText).toContain("custom_owner_note: keep me")
    expect(uploadedText).toContain("An updated skill description.")
    expect(uploadedText).toContain("Automate onboarding")
  })
})
