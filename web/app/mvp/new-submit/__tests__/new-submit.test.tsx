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

function fillCommonToolFields() {
  fireEvent.click(screen.getByRole("button", { name: /create tool/i }))
  fireEvent.change(screen.getByPlaceholderText("e.g. USDC Payments"), {
    target: { value: "USDC Payments" },
  })
  fireEvent.change(
    screen.getByPlaceholderText("Provide a description of the tool capabilities..."),
    { target: { value: "Pays things." } }
  )
}

function selectWasmFile() {
  const file = new File(["wasm bytes"], "usdc.wasm", { type: "application/wasm" })
  const input = document.querySelector('input[type="file"][accept=".wasm"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe("new-submit create -> upload flow", () => {
  beforeEach(() => {
    pushMock.mockClear()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("creates the artifact then uploads wasm and capabilities, and redirects to the dashboard", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({
            artifact: { id: "artifact-1", title: "USDC Payments" },
          }),
          { status: 201 }
        )
      }
      if (url.endsWith("/content/wasm") || url.endsWith("/content/capabilities")) {
        return new Response(null, { status: 201 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    fillCommonToolFields()
    selectWasmFile()

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/mvp/dashboard"))

    const calledUrls = vi.mocked(fetch).mock.calls.map(([input]) => String(input))
    expect(calledUrls).toEqual([
      "/api/private-artifacts",
      "/api/private-artifacts/artifact-1/content/wasm",
      "/api/private-artifacts/artifact-1/content/capabilities",
    ])
  })

  it("on a partial upload failure, redirects to the manage page instead of dead-ending the form", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url === "/api/private-artifacts") {
        return new Response(
          JSON.stringify({
            artifact: { id: "artifact-2", title: "USDC Payments" },
          }),
          { status: 201 }
        )
      }
      if (url.endsWith("/content/wasm")) {
        return new Response(null, { status: 201 })
      }
      if (url.endsWith("/content/capabilities")) {
        return new Response(JSON.stringify({ error: "storage unavailable" }), {
          status: 500,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()
    fillCommonToolFields()
    selectWasmFile()

    fireEvent.click(screen.getByRole("button", { name: /add to space/i }))

    // The artifact was created (POST succeeded) but capabilities upload
    // failed — retrying "Add to Space" would 409 on name+version, so the
    // user must be sent to the manage page to finish uploading instead of
    // being stuck on the create form.
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/mvp/manage/artifact-2")
    )
    expect(pushMock).not.toHaveBeenCalledWith("/mvp/dashboard")
  })
})
