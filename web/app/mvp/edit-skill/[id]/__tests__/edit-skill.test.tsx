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
  return { ...result!, queryClient }
}

/** Tracks every PUT to the skill_md content route across a test. */
function trackPutCalls() {
  const putCalls: Array<{ url: string; body: Blob }> = []
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input)
    if (
      url === "/api/private-artifacts/artifact-1" &&
      (!init || init.method === undefined)
    ) {
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    }
    if (
      url === "/api/private-artifacts/artifact-1" &&
      init?.method === "PATCH"
    ) {
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    }
    if (
      url === "/api/private-artifacts/artifact-1/content/skill_md" &&
      init?.method === "PUT"
    ) {
      putCalls.push({ url, body: init.body as Blob })
      return new Response(JSON.stringify({ content: { kind: "skill_md" } }), {
        status: 201,
      })
    }
    throw new Error(
      `Unexpected fetch in trackPutCalls: ${url} ${init?.method ?? "GET"}`
    )
  })
  return putCalls
}

describe("edit-skill content loading", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("disables saving, shows an error, and blocks the actual PUT when the stored SKILL.md fails to load (500)", async () => {
    const putCalls = trackPutCalls()
    const baseImpl = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (
        url === "/api/private-artifacts/artifact-1/content/skill_md" &&
        init?.method !== "PUT"
      ) {
        return new Response(JSON.stringify({ error: "Internal error" }), {
          status: 500,
        })
      }
      return baseImpl(input, init)
    })

    await renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(/stored instructions could not be loaded/i)
      ).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    // B3: the guard must live in the submit handler, not just the button's
    // `disabled` prop -- firing a submit directly must not produce a PUT.
    fireEvent.submit(saveButton.closest("form")!)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(putCalls.length).toBe(0)
  })

  it("flags a fenceParseFailed file as blocked, distinctly from a load failure, blocks the PUT, and lifts once the user fixes the YAML in the body", async () => {
    const malformed = [
      "---",
      "name: s",
      "description: Handles auth: login and logout",
      "use_cases:",
      "  - Log a user in",
      "---",
      "",
      "Body.",
    ].join("\n")

    const putCalls = trackPutCalls()
    const baseImpl = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (
        url === "/api/private-artifacts/artifact-1/content/skill_md" &&
        init?.method !== "PUT"
      ) {
        return new Response(malformed, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        })
      }
      return baseImpl(input, init)
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText(/not valid yaml/i)).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    // Nothing was silently dropped: the whole original file, fence
    // included, is sitting in the body textarea, editable.
    const bodyField = screen.getByPlaceholderText(
      /describe how the agent should act/i
    )
    expect(bodyField).toHaveValue(malformed)

    fireEvent.submit(saveButton.closest("form")!)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(putCalls.length).toBe(0)

    // NB2: the block must be liftable -- fix the YAML directly in the body
    // (quote the value so the colon-in-value no longer looks like a nested
    // mapping) and saving should become available again.
    const fixed = malformed.replace(
      "description: Handles auth: login and logout",
      'description: "Handles auth: login and logout"'
    )
    fireEvent.change(bodyField, { target: { value: fixed } })

    await waitFor(() => {
      expect(screen.queryByText(/not valid yaml/i)).not.toBeInTheDocument()
      expect(saveButton).not.toBeDisabled()
    })

    // The fenceParseFailed load never seeded description/value_prop (the
    // original frontmatter was unparseable, so both fields started blank)
    // and both are `required` -- fill them so jsdom's own constraint
    // validation doesn't block the submit for a reason unrelated to what
    // this test is checking.
    fireEvent.change(screen.getByPlaceholderText("What this skill does..."), {
      target: { value: "Handles auth." },
    })
    fireEvent.change(
      screen.getByPlaceholderText("Core value or pitch of this skill..."),
      {
        target: { value: "Auth made easy." },
      }
    )

    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(putCalls.length).toBe(1)
    })

    // NB2c: pin the repair-path outcome rather than leaving it unexamined.
    // Editing the fence in place (instead of deleting it) produces a
    // double-fenced file -- the old frontmatter is now inert text inside
    // the body, not real frontmatter -- but nothing is lost and it's
    // stable (reparses cleanly, doesn't degrade further on a later save).
    // This is the accepted, documented outcome; the banner's "or delete
    // the old fence" guidance is the way to avoid it.
    const uploadedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(putCalls[0].body)
    })
    const expectedBytes = [
      "---",
      "name: my-skill",
      "version: 1.0.0",
      "description: Handles auth.",
      "value_prop: Auth made easy.",
      "---",
      "---",
      "name: s",
      'description: "Handles auth: login and logout"',
      "use_cases:",
      "  - Log a user in",
      "---",
      "",
      "Body.",
    ].join("\n")
    expect(uploadedText).toBe(expectedBytes)
  })

  // NB2b regression: a *healthy* file must never be locked out by text the
  // user types afterward. Documenting a frontmatter example inside a
  // skill's own instructions is ordinary content for this kind of editor.
  it("does not block saving when the user types a --- fence into the body of an otherwise valid, loaded file", async () => {
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
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByDisplayValue("Does the thing.")).toBeInTheDocument()
    })

    const bodyField = screen.getByPlaceholderText(
      /describe how the agent should act/i
    )
    // A user documenting a frontmatter example at the *top* of the body --
    // parseSkillMd only looks for a fence at position 0, so this has to be
    // the very first thing in the textarea to reproduce NB2b. The example
    // (unquoted colon-in-value) would fail to parse in isolation, but the
    // *stored* file loaded cleanly, so this must not block saving.
    fireEvent.change(bodyField, {
      target: {
        value:
          "---\nUsage: run it like: this\n---\n\n## Persona\n\nBe helpful.",
      },
    })

    expect(screen.queryByText(/not valid yaml/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).not.toBeDisabled()
  })

  it("treats a 404 (no content row yet) as a safe, savable empty state -- not a load failure", async () => {
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
      expect(
        screen.queryByText(/stored instructions could not be loaded/i)
      ).not.toBeInTheDocument()
      expect(screen.getByText(/has no instructions yet/i)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
    })

    // Nothing was ever stored -- the body textarea starts empty, not an
    // error state, so the owner can create the file from here.
    const bodyField = screen.getByPlaceholderText(
      /describe how the agent should act/i
    )
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
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByDisplayValue("Does the thing.")).toBeInTheDocument()
    })
  })

  // This is the test that actually guards the bug this lane exists to fix:
  // editing one known field and saving must not drop a frontmatter key the
  // form doesn't expose. Deleting the `...baseFrontmatter,` spread in
  // page.tsx's buildFrontmatter() -- i.e. reintroducing the original bug --
  // must fail this test.
  it("preserves an unknown frontmatter key in the uploaded bytes after editing a known field and saving", async () => {
    const putCalls = trackPutCalls()
    const baseImpl = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (
        url === "/api/private-artifacts/artifact-1/content/skill_md" &&
        init?.method !== "PUT"
      ) {
        return new Response(storedFileWithUnknownKey, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        })
      }
      return baseImpl(input, init)
    })

    await renderPage()

    // Wait for the seeded value itself, not just the button being enabled:
    // `contentReady` (which enables the button) is derived directly from
    // `skillContent.data` during render, but `description` is populated by
    // a separate useEffect that runs one render later. Waiting only for the
    // button can race ahead of that effect and interact with a still-blank
    // form (see edit-tool's equivalent fix for the bug this caused there).
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByDisplayValue("A skill.")).toBeInTheDocument()
    })

    // Edit only a known field -- description -- leaving `custom_owner_note`
    // untouched, exactly the scenario D5's binding rule covers.
    const descriptionField = screen.getByDisplayValue("A skill.")
    fireEvent.change(descriptionField, {
      target: { value: "An updated skill description." },
    })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

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

  // Mirrors edit-tool's equivalent test: a metadata-only save (title only)
  // must not re-upload skill_md when nothing the user edits changed. The
  // baseline compared against is the as-loaded state re-serialized (not the
  // literal fetched bytes), since js-yaml's dump normalizes formatting on
  // its way through -- comparing against the raw fetched text would treat
  // that normalization alone as a "change" and defeat this optimization.
  it("does not re-upload skill_md on a metadata-only save when nothing in the form changed", async () => {
    const putCalls = trackPutCalls()
    const baseImpl = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (
        url === "/api/private-artifacts/artifact-1/content/skill_md" &&
        init?.method !== "PUT"
      ) {
        return new Response(storedFileWithUnknownKey, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        })
      }
      return baseImpl(input, init)
    })

    await renderPage()

    // Wait for the seeded value, not just the button, for the same reason
    // as the test above -- otherwise this test could pass or fail on
    // timing rather than on the skip-when-unchanged logic under test.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByDisplayValue("Does the thing.")).toBeInTheDocument()
    })

    // Change only the title -- leave every frontmatter field and the body
    // exactly as loaded.
    fireEvent.change(screen.getByDisplayValue("My Skill"), {
      target: { value: "My Renamed Skill" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
    })

    expect(putCalls.length).toBe(0)
  })

  // N6 regression: a background refetch failing *after* an initial success
  // must not block saving or wipe the loaded form -- the user still has
  // real, safe content to save on top of. This is the one path item 3's
  // review had to verify by hand; pin it here.
  it("does not block saving or clear the form when a background refetch fails after an initial success", async () => {
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

    const { queryClient } = await renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).not.toBeDisabled()
      expect(screen.getByDisplayValue("Does the thing.")).toBeInTheDocument()
    })

    // Now make the content route fail, and force a refetch (standing in for
    // the real trigger -- refetchOnWindowFocus after staleTime elapses).
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

    await act(async () => {
      queryClient.refetchQueries({
        queryKey: ["private-artifact-content", "artifact-1", "skill_md"],
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Not the hard-failure banner (that would wrongly claim saving is
    // disabled), a soft non-blocking note instead, and the button and the
    // already-loaded form are unaffected.
    await waitFor(() => {
      expect(
        screen.getByText(/could not refresh the stored instructions/i)
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByText(/stored instructions could not be loaded/i)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).not.toBeDisabled()
    expect(screen.getByDisplayValue("Does the thing.")).toBeInTheDocument()
  })
})
