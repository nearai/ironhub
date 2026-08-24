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
import NewSubmitPage from "../page"

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NewSubmitPage />
      </ToastProvider>
    </QueryClientProvider>
  )
}

function openToolTab() {
  fireEvent.click(screen.getByRole("button", { name: /^tool\b/i }))
}

function getZipInput() {
  return document.querySelector(
    'input[type="file"][accept=".zip"]'
  ) as HTMLInputElement
}

function selectFile(file: File) {
  fireEvent.change(getZipInput(), { target: { files: [file] } })
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

const inspectManifest = {
  manifest: {
    id: "usdc-payments",
    name: "USDC Payments",
    version: "1.2.0",
    description: "Pays things in USDC.",
    trust: "third_party",
    runtimeKind: "wasm",
    runtimeModule: "wasm/usdc-payments.wasm",
  },
  files: {
    wasm: "wasm/usdc-payments.wasm",
    capabilities: "usdc-payments-tool.capabilities.json",
    schemas: [],
    prompts: [],
  },
  totalUncompressedBytes: 4096,
}

describe("new-submit tool tab (zip bundle flow)", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects a non-zip file in the client and makes no request", () => {
    renderPage()
    openToolTab()

    const file = new File(["wasm bytes"], "usdc.wasm", {
      type: "application/wasm",
    })
    selectFile(file)

    expect(
      screen.getByText("Only .zip archives are accepted.")
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("prefills title, version, and description from a successful inspect response", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", {
      type: "application/zip",
    })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )
    expect(screen.getByPlaceholderText("e.g. 1.0.0")).toHaveValue("1.2.0")
    expect(
      screen.getByPlaceholderText(
        "Provide a description of the tool capabilities..."
      )
    ).toHaveValue("Pays things in USDC.")

    // The name stays editable; the version is the package's own and is not
    // editable here. There is no identifier field at all -- a tool derives
    // one from its name exactly as a skill does.
    fireEvent.change(screen.getByPlaceholderText("e.g. USDC Payments"), {
      target: { value: "USDC Payments v2" },
    })
    expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
      "USDC Payments v2"
    )
    expect(
      screen.queryByPlaceholderText("e.g. usdc-payments")
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/identifier/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText("e.g. 1.0.0")).toHaveAttribute(
      "readonly"
    )
    expect(screen.getByPlaceholderText("e.g. 1.0.0")).toHaveValue("1.2.0")
  })

  it("sends an identifier derived from the tool name the author last typed", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({ artifact: { id: "artifact-3" } }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/artifact-3/bundle") {
        return new Response(JSON.stringify({ content: [] }), { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    selectFile(
      new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    )
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )

    fireEvent.change(screen.getByPlaceholderText("e.g. USDC Payments"), {
      target: { value: "USDC Payments v2" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalled())

    const createCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input) === "/api/private-artifacts")
    const createBody = JSON.parse(String(createCall?.[1]?.body))
    expect(createBody).toMatchObject({
      name: "usdc-payments-v2",
      title: "USDC Payments v2",
      version: "1.2.0",
    })
  })

  it("prefills normally and enables submission from an inspect response with no capabilities file", async () => {
    // design.md D3/D6: a bundle without *.capabilities.json is now a valid
    // upload, and the inspect response reports `files.capabilities: null`
    // for it. The form doesn't read `files.capabilities` at all -- this
    // pins that a null there doesn't blow up rendering or leave the
    // "Inspected" state looking broken/empty, and the submit button still
    // enables from the manifest fields alone.
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(
          JSON.stringify({
            ...inspectManifest,
            files: { ...inspectManifest.files, capabilities: null },
          }),
          { status: 200 }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", {
      type: "application/zip",
    })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )
    expect(screen.getByText("Inspected")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /add to space/i })
    ).not.toBeDisabled()
  })

  it("names the suffix the server picked when the derived identifier was taken", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      if (url === "/api/private-artifacts") {
        // The server suffixes a name another item already holds
        // (service.ts: findAvailableArtifactName).
        return new Response(
          JSON.stringify({
            artifact: { id: "artifact-5", name: "usdc-payments-2" },
          }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/artifact-5/bundle") {
        return new Response(JSON.stringify({ content: [] }), { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    selectFile(
      new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    )
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/created as "usdc-payments-2"/i)
      ).toBeInTheDocument()
    )
  })

  it("derives the artifact name from the manifest id, replacing only what's illegal for that field and preserving a legal underscore", async () => {
    // manifest.toml `id` (D6 rule 8) allows "." and "_"; the server's
    // artifact-name charset (service.ts: /^[a-z0-9][a-z0-9_-]*$/) allows "_"
    // but not ".". A general slugify() would collapse "_" to "-" too,
    // silently diverging the artifact name from the id the extension
    // declares — this pins that only the "." gets replaced.
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(
          JSON.stringify({
            ...inspectManifest,
            manifest: { ...inspectManifest.manifest, id: "acme.usdc_payments" },
          }),
          { status: 200 }
        )
      }
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({ artifact: { id: "artifact-4" } }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/artifact-4/bundle") {
        return new Response(JSON.stringify({ content: [] }), { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    selectFile(
      new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    )

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalled())

    const createCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input) === "/api/private-artifacts")
    const createBody = JSON.parse(String(createCall?.[1]?.body))
    expect(createBody).toMatchObject({ name: "acme-usdc_payments" })
  })

  it("shows the server's wrapper-folder message verbatim and blocks submission", async () => {
    const wrapperMessage =
      'Zip must contain the extension files at its root, not inside a wrapper folder (found "usdc-payments/"). Re-zip the folder\'s contents, not the folder itself.'

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify({ error: wrapperMessage }), {
          status: 400,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", {
      type: "application/zip",
    })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByText(wrapperMessage)).toBeInTheDocument()
    )

    const submitButton = screen.getByRole("button", { name: /add to space/i })
    expect(submitButton).toBeDisabled()

    fireEvent.click(submitButton)
    expect(fetch).toHaveBeenCalledTimes(1) // only the failed inspect call, no create attempt
  })

  it("creates the artifact then uploads the bundle, and redirects to the dashboard", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({
            artifact: { id: "artifact-1", title: "USDC Payments" },
          }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/artifact-1/bundle") {
        return new Response(JSON.stringify({ content: [] }), { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", {
      type: "application/zip",
    })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )

    // Exercise category + repository link too, so the body assertion below
    // pins those exact field names reaching the create request rather than
    // just their falsy defaults — a route mocked purely by URL would never
    // catch a field going missing or misnamed.
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Dev Tools" },
    })
    fireEvent.change(
      screen.getByPlaceholderText("https://github.com/org/repo"),
      {
        target: { value: "https://github.com/acme/usdc-payments" },
      }
    )

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/catalog"))

    const calls = vi.mocked(fetch).mock.calls
    const calledUrls = calls.map(([input]) => String(input))
    expect(calledUrls).toEqual([
      "/api/private-artifacts/bundle/inspect",
      "/api/private-artifacts",
      "/api/private-artifacts/artifact-1/bundle",
    ])

    const [, createInit] = calls[1]
    const createBody = JSON.parse(String(createInit?.body))
    expect(createBody).toMatchObject({
      category: "Dev Tools",
      sourceUrl: "https://github.com/acme/usdc-payments",
    })

    // The live bundle upload must send an explicit application/zip
    // Content-Type (design.md D6) rather than whatever the browser derives
    // from File.type — a raw `uploadContent()` PUT wouldn't set this header.
    const [, bundleUploadInit] = calls[2]
    expect(bundleUploadInit).toMatchObject({
      method: "PUT",
      headers: { "Content-Type": "application/zip" },
    })
  })

  it("on a partial bundle upload failure, redirects to the manage page instead of dead-ending the form", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({
            artifact: { id: "artifact-2", title: "USDC Payments" },
          }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/artifact-2/bundle") {
        return new Response(JSON.stringify({ error: "storage unavailable" }), {
          status: 500,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", {
      type: "application/zip",
    })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/dashboard/manage/artifact-2")
    )
    expect(pushMock).not.toHaveBeenCalledWith("/dashboard/catalog")
  })

  it("renders the SKILL.md placeholder with a real newline and no literal backslash-n", () => {
    renderPage()
    const textarea = screen.getByPlaceholderText(/## Persona/)
    const placeholder = textarea.getAttribute("placeholder") || ""
    expect(placeholder).toContain("\n")
    expect(placeholder).not.toContain("\\n")
  })

  it("does not mention capabilities.json, manifest.toml, or 'no longer required' in tool mode copy", () => {
    renderPage()
    openToolTab()
    expect(screen.queryByText(/capabilities\.json/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/manifest\.toml/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no longer required/i)).not.toBeInTheDocument()
  })

  it("renders visible helper text explaining why submit is disabled when no package is chosen in tool mode", () => {
    renderPage()
    openToolTab()
    expect(
      screen.getByText("Upload a tool package to continue")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add to space/i })).toBeDisabled()
  })

  it("renders numbered sections and no step counter in both skill and tool modes", () => {
    renderPage()
    expect(screen.queryByText(/step \d+ of \d+/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 1: What you are adding" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 2: Basics" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 3: Instructions (SKILL.md)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 4: Who can see it" })
    ).toBeInTheDocument()

    // Switch to tool mode
    openToolTab()
    expect(screen.queryByText(/step \d+ of \d+/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 1: What you are adding" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 2: Tool package" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 3: Basics" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Step 4: Who can see it" })
    ).toBeInTheDocument()
  })

  it("creates a skill artifact and uploads compiled markdown to skill_md, redirecting to the dashboard", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({
            artifact: { id: "skill-1", title: "Invoice Auditor" },
          }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/skill-1/content/skill_md") {
        return new Response(null, { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

    fireEvent.change(screen.getByPlaceholderText("e.g. Invoice Auditor"), {
      target: { value: "Invoice Auditor" },
    })
    fireEvent.change(screen.getByPlaceholderText("e.g. 1.0.0"), {
      target: { value: "2.1.0" },
    })
    fireEvent.change(
      screen.getByPlaceholderText("Core value or pitch of this skill..."),
      {
        target: { value: "Audits invoices." },
      }
    )
    fireEvent.change(screen.getByPlaceholderText(/## Persona/), {
      target: { value: "## Persona\n\nBe careful." },
    })

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/catalog"))

    const calls = vi.mocked(fetch).mock.calls
    const calledUrls = calls.map(([input]) => String(input))
    expect(calledUrls).toEqual([
      "/api/private-artifacts",
      "/api/private-artifacts/skill-1/content/skill_md",
    ])

    const [, skillUploadInit] = calls[1]
    const bodyBlob = skillUploadInit?.body as Blob
    expect(bodyBlob).toBeInstanceOf(Blob)
    const bodyText = await readBlobText(bodyBlob)
    expect(bodyText).toContain("name: invoice-auditor")
    expect(bodyText).toContain("version: 2.1.0")
    expect(bodyText).toContain("## Persona")
    expect(bodyText).toContain("Be careful.")
  })

  it("clears inspected bundle state and prefilled fields when switching away from tool mode and back", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", {
      type: "application/zip",
    })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue(
        "USDC Payments"
      )
    )
    expect(screen.getByText("Inspected")).toBeInTheDocument()

    // Switch to Skill mode
    fireEvent.click(screen.getByRole("button", { name: /^skill\b/i }))

    // Switch back to Tool mode
    openToolTab()

    expect(screen.queryByText("Inspected")).not.toBeInTheDocument()
    expect(screen.queryByText("usdc-payments.zip")).not.toBeInTheDocument()
  })

  it("clears bundle error when switching away from tool mode and back", () => {
    renderPage()
    openToolTab()

    const file = new File(["wasm bytes"], "usdc.wasm", {
      type: "application/wasm",
    })
    selectFile(file)

    expect(
      screen.getByText("Only .zip archives are accepted.")
    ).toBeInTheDocument()

    // Switch to Skill mode
    fireEvent.click(screen.getByRole("button", { name: /^skill\b/i }))

    // Switch back to Tool mode
    openToolTab()

    expect(
      screen.queryByText("Only .zip archives are accepted.")
    ).not.toBeInTheDocument()
  })
})
