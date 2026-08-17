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
  fireEvent.click(screen.getByRole("button", { name: /create tool/i }))
}

function getZipInput() {
  return document.querySelector('input[type="file"][accept=".zip"]') as HTMLInputElement
}

function selectFile(file: File) {
  fireEvent.change(getZipInput(), { target: { files: [file] } })
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

    const file = new File(["wasm bytes"], "usdc.wasm", { type: "application/wasm" })
    selectFile(file)

    expect(screen.getByText("Only .zip archives are accepted.")).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("prefills title, artifact name, version, and description from a successful inspect response", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify(inspectManifest), { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue("USDC Payments")
    )
    expect(screen.getByPlaceholderText("e.g. usdc-payments")).toHaveValue("usdc-payments")
    expect(screen.getByPlaceholderText("e.g. 1.0.0")).toHaveValue("1.2.0")
    expect(
      screen.getByPlaceholderText("Provide a description of the tool capabilities...")
    ).toHaveValue("Pays things in USDC.")

    // Prefilled fields stay editable.
    fireEvent.change(screen.getByPlaceholderText("e.g. USDC Payments"), {
      target: { value: "USDC Payments v2" },
    })
    expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue("USDC Payments v2")
  })

  it("shows the server's wrapper-folder message verbatim and blocks submission", async () => {
    const wrapperMessage =
      'Zip must contain the extension files at its root, not inside a wrapper folder (found "usdc-payments/"). Re-zip the folder\'s contents, not the folder itself.'

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts/bundle/inspect") {
        return new Response(JSON.stringify({ error: wrapperMessage }), { status: 400 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    selectFile(file)

    await waitFor(() => expect(screen.getByText(wrapperMessage)).toBeInTheDocument())

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
          JSON.stringify({ artifact: { id: "artifact-1", title: "USDC Payments" } }),
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

    const file = new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue("USDC Payments")
    )

    // Exercise category + repository link too, so the body assertion below
    // pins those exact field names reaching the create request rather than
    // just their falsy defaults — a route mocked purely by URL would never
    // catch a field going missing or misnamed.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Dev Tools" } })
    fireEvent.change(screen.getByPlaceholderText("https://github.com/org/repo"), {
      target: { value: "https://github.com/acme/usdc-payments" },
    })

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/mvp/dashboard"))

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
          JSON.stringify({ artifact: { id: "artifact-2", title: "USDC Payments" } }),
          { status: 201 }
        )
      }
      if (url === "/api/private-artifacts/artifact-2/bundle") {
        return new Response(JSON.stringify({ error: "storage unavailable" }), { status: 500 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    openToolTab()

    const file = new File(["zip bytes"], "usdc-payments.zip", { type: "application/zip" })
    selectFile(file)

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. USDC Payments")).toHaveValue("USDC Payments")
    )

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/mvp/manage/artifact-2"))
    expect(pushMock).not.toHaveBeenCalledWith("/mvp/dashboard")
  })
})
