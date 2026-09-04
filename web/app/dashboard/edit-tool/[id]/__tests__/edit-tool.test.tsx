import { act } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ToastProvider } from "@/features/partner/store/toast-provider"
import { ToolEditor } from "@/features/partner/components/tool-editor"

const artifact = {
  id: "artifact-1",
  organizationId: "org-1",
  createdById: null,
  type: "tool",
  name: "my-tool",
  title: "My Tool",
  version: "1.0.0",
  visibility: "private",
  status: "draft",
  description: "A tool.",
  category: "Dev Tools",
  sourceUrl: null,
  content: [],
  assets: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

/**
 * What the artifact read answers with, per test. A tool with a stored package
 * renders a different Package step than one whose upload never completed, and
 * both states have to be exercised.
 */
let currentArtifact: typeof artifact = artifact
let bundleEntries: Array<{ path: string; sizeBytes: number }> = []

async function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ToolEditor id="artifact-1" />
        </ToastProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return queryClient
}

/** Records every write the editor makes, so "wrote nothing" is assertable. */
function trackWrites() {
  const writes: Array<{ url: string; method: string }> = []
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    if (url === "/api/private-artifacts/artifact-1" && method === "GET") {
      return new Response(JSON.stringify({ artifact: currentArtifact }), {
        status: 200,
      })
    }
    if (url.endsWith("/bundle/entries") && method === "GET") {
      return new Response(JSON.stringify({ entries: bundleEntries }), {
        status: 200,
      })
    }
    writes.push({ url, method })
    if (url === "/api/private-artifacts/artifact-1" && method === "PATCH") {
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    }
    if (url.endsWith("/bundle") && method === "PUT") {
      return new Response(JSON.stringify({ content: [] }), { status: 201 })
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`)
  })
  return writes
}

describe("edit-tool", () => {
  beforeEach(() => {
    currentArtifact = artifact
    bundleEntries = []
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("seeds the form from the artifact record and saves without touching stored files", async () => {
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue("A tool.")).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue("My Tool"), {
      target: { value: "My Renamed Tool" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => expect(writes.length).toBeGreaterThan(0))

    // A metadata edit is a PATCH and nothing else: no stored file is rewritten
    // just because the title changed.
    expect(writes).toEqual([
      { url: "/api/private-artifacts/artifact-1", method: "PATCH" },
    ])
  })

  it("does not ask for a capabilities document, which the manifest now carries", async () => {
    // Regression guard for the removal: *.capabilities.json is the legacy
    // carrier of data reborn.extension_manifest.v3 owns, so the editor must
    // neither read it nor offer to edit it.
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/permissions/i)).not.toBeInTheDocument()
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes("capabilities"))
    ).toBe(false)
    expect(writes).toEqual([])
  })

  it("uploads a replacement package as soon as one is chosen, without waiting for save", async () => {
    // The package is replaced whole and immediately: the PUT rewrites every
    // stored file and the entire declared asset set server-side, which is not
    // something to fold into a form submit that could half-apply.
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File([new Uint8Array([0])], "tool.zip")] },
      })
    })

    await waitFor(() =>
      expect(writes).toEqual([
        { url: "/api/private-artifacts/artifact-1/bundle", method: "PUT" },
      ])
    )
    // The route reads the body as raw archive bytes, so the type has to be
    // stated explicitly rather than left to whatever fetch infers from a File.
    const bundleCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([reqInput]) =>
          String(reqInput) === "/api/private-artifacts/artifact-1/bundle"
      )
    expect(bundleCall?.[1]).toMatchObject({
      method: "PUT",
      headers: { "Content-Type": "application/zip" },
    })
  })

  it("rejects a file that is not a .zip without making a request", async () => {
    const writes = trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await act(async () => {
      fireEvent.change(fileInput, {
        target: {
          files: [new File([new Uint8Array([0])], "tool.wasm")],
        },
      })
    })

    expect(
      screen.getByText("Only .zip archives are accepted.")
    ).toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it("offers no way to replace a single file inside the package", async () => {
    // Regression guard: a lone .wasm swap left manifest.toml describing bytes
    // that were no longer stored, so the whole archive is the unit of change.
    trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    expect(screen.queryByText(/program file/i)).not.toBeInTheDocument()
    const fileInputs = document.querySelectorAll('input[type="file"]')
    expect(fileInputs).toHaveLength(1)
    expect(fileInputs[0].getAttribute("accept")).toBe(".zip")
  })

  it("lists the files inside the stored package", async () => {
    currentArtifact = {
      ...artifact,
      content: [
        {
          kind: "bundle_zip",
          sha256: "abc123",
          sizeBytes: 917,
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    } as typeof artifact
    bundleEntries = [
      { path: "manifest.toml", sizeBytes: 284 },
      { path: "schemas/scrape.input.v1.json", sizeBytes: 1331 },
      { path: "my_tool.wasm", sizeBytes: 8 },
    ]
    trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByText("manifest.toml")).toBeInTheDocument()
    })
    // Folders are derived from the paths and named without their parents.
    expect(screen.getByText("schemas/")).toBeInTheDocument()
    expect(screen.getByText("scrape.input.v1.json")).toBeInTheDocument()
    expect(screen.getByText("my_tool.wasm")).toBeInTheDocument()
  })

  it("omits version from the PATCH when the field was not touched", async () => {
    // The server refuses a version equal to the stored one, so a title-only
    // save that sent the field back unchanged would fail for no reason.
    const bodies: string[] = []
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url === "/api/private-artifacts/artifact-1" && method === "GET") {
        return new Response(JSON.stringify({ artifact: currentArtifact }), {
          status: 200,
        })
      }
      bodies.push(String(init?.body))
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    })

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })
    fireEvent.change(screen.getByDisplayValue("My Tool"), {
      target: { value: "My Renamed Tool" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => expect(bodies.length).toBe(1))
    expect(JSON.parse(bodies[0])).not.toHaveProperty("version")
  })

  it("sends the new version when the field is edited", async () => {
    const bodies: string[] = []
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url === "/api/private-artifacts/artifact-1" && method === "GET") {
        return new Response(JSON.stringify({ artifact: currentArtifact }), {
          status: 200,
        })
      }
      bodies.push(String(init?.body))
      return new Response(JSON.stringify({ artifact }), { status: 200 })
    })

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.0")).toBeInTheDocument()
    })
    fireEvent.change(screen.getByDisplayValue("1.0.0"), {
      target: { value: "1.1.0" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => expect(bodies.length).toBe(1))
    expect(JSON.parse(bodies[0]).version).toBe("1.1.0")
  })

  it("shows a version refusal against the version field, not as a form error", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url === "/api/private-artifacts/artifact-1" && method === "GET") {
        return new Response(JSON.stringify({ artifact: currentArtifact }), {
          status: 200,
        })
      }
      return new Response(
        "version 0.9.0 is not greater than the current version 1.0.0",
        { status: 400 }
      )
    })

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.0")).toBeInTheDocument()
    })
    fireEvent.change(screen.getByDisplayValue("1.0.0"), {
      target: { value: "0.9.0" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/is not greater than the current version/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue("0.9.0")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("refuses a package upload while the published version is frozen", async () => {
    currentArtifact = {
      ...artifact,
      status: "published",
      publishedVersion: "1.0.0",
    } as typeof artifact
    trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    // The freeze is stated where the upload happens, and the control is shut,
    // so the author meets the rule instead of a rejected request.
    expect(screen.getByText(/version 1\.0\.0 is published/i)).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeDisabled()
  })

  it("does not ask for a package listing when no package is stored", async () => {
    trackWrites()

    await renderEditor()

    await waitFor(() => {
      expect(screen.getByDisplayValue("My Tool")).toBeInTheDocument()
    })

    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes("bundle/entries"))
    ).toBe(false)
    expect(screen.getByText(/no package is stored yet/i)).toBeInTheDocument()
  })
})
