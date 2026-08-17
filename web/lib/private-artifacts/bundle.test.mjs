import assert from "node:assert/strict"
import test from "node:test"

import { zipSync } from "fflate"

import { inspectExtensionBundle, readBundleFile } from "./bundle.ts"

const encode = (text) => new TextEncoder().encode(text)

// Unix external-attributes mode bits for a symlink (S_IFLNK | rwxrwxrwx),
// shifted into the upper 16 bits the way zip central directory records
// store them. os: 3 marks the entry as coming from a Unix archiver, which is
// required for those bits to mean anything to a reader.
const SYMLINK_ATTRS = 0o120777 << 16

function manifestToml(fields = {}) {
  const merged = {
    id: "test-tool",
    name: "Test Tool",
    version: "0.1.0",
    description: "A test tool for bundle validation tests.",
    trust: "third_party",
    runtimeModule: "wasm/test.wasm",
    ...fields,
  }

  const lines = [`schema_version = "reborn.extension_manifest.v3"`]
  for (const key of ["id", "name", "version", "description", "trust"]) {
    if (merged[key] !== undefined) {
      lines.push(`${key} = ${JSON.stringify(merged[key])}`)
    }
  }
  lines.push("", "[runtime]", `kind = "wasm"`)
  if (merged.runtimeModule !== undefined) {
    lines.push(`module = ${JSON.stringify(merged.runtimeModule)}`)
  }
  return lines.join("\n") + "\n"
}

// A minimal, valid bundle layout modeled on tools/firecrawl: manifest.toml +
// wasm module + one capabilities file at the root, plus schemas/ and
// prompts/ subtrees.
function baseFiles(overrides = {}) {
  return {
    "manifest.toml": encode(
      overrides.manifestToml !== undefined
        ? overrides.manifestToml
        : manifestToml(overrides.manifestFields)
    ),
    "wasm/test.wasm": overrides.wasmBytes ?? new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]),
    "test-tool.capabilities.json":
      overrides.capabilitiesBytes ?? encode(JSON.stringify({ version: "0.1.0" })),
    "schemas/test/scrape.input.v1.json": encode("{}"),
    "prompts/test/scrape.md": encode("# scrape"),
  }
}

function zipOf(files, options = {}) {
  return zipSync(files, { level: 0, ...options })
}

async function assertRejection(zip, expectedStatus, messagePattern) {
  try {
    inspectExtensionBundle(zip)
    assert.fail("expected inspectExtensionBundle to throw")
  } catch (error) {
    assert.ok(error instanceof Response, "rejection must be a Response")
    assert.equal(error.status, expectedStatus)
    const text = await error.text()
    assert.match(text, messagePattern)
  }
}

// --- Happy path -------------------------------------------------------------

test("accepts a well-formed bundle and returns the parsed manifest + layout", () => {
  const zip = zipOf(baseFiles())
  const inspected = inspectExtensionBundle(zip)

  assert.deepEqual(inspected.manifest, {
    schemaVersion: "reborn.extension_manifest.v3",
    id: "test-tool",
    name: "Test Tool",
    version: "0.1.0",
    description: "A test tool for bundle validation tests.",
    trust: "third_party",
    runtimeKind: "wasm",
    runtimeModule: "wasm/test.wasm",
  })
  assert.equal(inspected.wasmPath, "wasm/test.wasm")
  assert.equal(inspected.capabilitiesPath, "test-tool.capabilities.json")
  assert.deepEqual(inspected.schemaFiles, ["schemas/test/scrape.input.v1.json"])
  assert.deepEqual(inspected.promptFiles, ["prompts/test/scrape.md"])
  assert.ok(inspected.entryNames.includes("manifest.toml"))
  assert.ok(inspected.totalUncompressedBytes > 0)
})

test("readBundleFile reads back the resolved wasm module", () => {
  const zip = zipOf(baseFiles())
  const bytes = readBundleFile(zip, "wasm/test.wasm")
  assert.deepEqual(Array.from(bytes), [0, 97, 115, 109, 1, 0, 0, 0])
})

test("readBundleFile throws a 400 Response for a path not in the zip", () => {
  const zip = zipOf(baseFiles())
  assert.throws(
    () => readBundleFile(zip, "does/not/exist"),
    (error) => error instanceof Response && error.status === 400
  )
})

test("__MACOSX/ and .DS_Store entries do not trip the wrapper or capabilities checks", () => {
  const zip = zipOf({
    ...baseFiles(),
    "__MACOSX/._manifest.toml": encode("junk"),
    ".DS_Store": encode("junk"),
    "schemas/.DS_Store": encode("junk"),
  })
  const inspected = inspectExtensionBundle(zip)
  assert.equal(inspected.manifest.id, "test-tool")
})

// --- Table-driven rejections, one per D6 validation rule --------------------
//
// Every rejection scenario in design.md D6 gets a row here, asserting both
// the status code and the exact message text (the UI lane surfaces these
// verbatim, so wording drift is a real regression).

const rejectionCases = [
  {
    name: "rule 1: magic bytes -- not a zip at all",
    zip: () => encode("this is definitely not a zip file"),
    status: 400,
    message: /^Upload must be a \.zip archive$/,
  },
  {
    name: "rule 1: magic bytes -- looks like a zip footer but has no header",
    zip: () => encode("PK\x05\x06 fake end-of-central-directory only, no local header"),
    status: 400,
    message: /^Upload must be a \.zip archive$/,
  },
  {
    name: "rule 2: compressed size cap (whole archive > 25MB)",
    zip: () =>
      zipOf(
        { ...baseFiles(), "wasm/big.bin": new Uint8Array(26 * 1024 * 1024) },
        { level: 0 } // store, so compressed size == uncompressed size
      ),
    status: 400,
    message: /^Zip archive is too large \(max 25MB compressed\)$/,
  },
  {
    name: "rule 2: entry count cap (> 2000 entries)",
    zip: () => {
      const files = { ...baseFiles() }
      for (let i = 0; i < 2001; i++) {
        files[`extra/file-${i}.txt`] = new Uint8Array(0)
      }
      return zipOf(files)
    },
    status: 400,
    message: /^Zip archive has too many entries$/,
  },
  {
    name: "rule 2: total uncompressed cap (> 100MB uncompressed, small compressed)",
    zip: () => {
      // Five 21MB entries: each stays under the 25MB per-entry cap on its
      // own, but the 105MB sum trips the total-uncompressed cap.
      const files = { ...baseFiles() }
      for (let i = 0; i < 5; i++) {
        files[`schemas/pad-${i}.bin`] = new Uint8Array(21 * 1024 * 1024)
      }
      return zipOf(files, { level: 1 }) // fast; all-zero data compresses well at any level
    },
    status: 400,
    message: /^Zip archive is too large \(max 100MB uncompressed\)$/,
  },
  {
    name: "rule 2: per-entry cap (single entry > 25MB uncompressed)",
    zip: () =>
      zipOf(
        { ...baseFiles(), "wasm/big.bin": new Uint8Array(26 * 1024 * 1024) },
        { level: 1 } // fast, and all-zero data compresses well at any level
      ),
    status: 400,
    message: /^Zip archive is too large \(max 25MB per entry\)$/,
  },
  {
    name: "rule 3: path traversal via '..' segment",
    zip: () => zipOf({ ...baseFiles(), "../outside.wasm": new Uint8Array([1]) }),
    status: 400,
    message: /^Zip contains an unsafe entry path: \.\.\/outside\.wasm$/,
  },
  {
    name: "rule 3: absolute path entry",
    zip: () => zipOf({ ...baseFiles(), "/etc/passwd": new Uint8Array([1]) }),
    status: 400,
    message: /^Zip contains an unsafe entry path: \/etc\/passwd$/,
  },
  {
    name: "rule 3: backslash in entry name",
    zip: () => zipOf({ ...baseFiles(), "wasm\\evil.wasm": new Uint8Array([1]) }),
    status: 400,
    message: /^Zip contains an unsafe entry path: wasm\\evil\.wasm$/,
  },
  {
    name: "rule 3: NUL byte in entry name",
    zip: () => zipOf({ ...baseFiles(), "evil\0.txt": new Uint8Array([1]) }),
    status: 400,
    message: /^Zip contains an unsafe entry path: evil\0\.txt$/,
  },
  {
    name: "rule 3: symlink entry",
    zip: () =>
      zipOf({
        ...baseFiles(),
        link: [encode("wasm/test.wasm"), { os: 3, attrs: SYMLINK_ATTRS }],
      }),
    status: 400,
    message: /^Zip contains an unsafe entry path: link$/,
  },
  {
    name: "rule 4: wrapper directory",
    zip: () => {
      const wrapped = {}
      for (const [name, bytes] of Object.entries(baseFiles())) {
        wrapped[`firecrawl/${name}`] = bytes
      }
      return zipOf(wrapped)
    },
    status: 400,
    message:
      /^Zip must contain the extension files at its root, not inside a wrapper folder \(found "firecrawl\/"\)\. Re-zip the folder's contents, not the folder itself\.$/,
  },
  {
    name: "rule 5: missing manifest.toml",
    zip: () => {
      const files = baseFiles()
      delete files["manifest.toml"]
      return zipOf(files)
    },
    status: 400,
    message: /^Zip is missing manifest\.toml at its root$/,
  },
  {
    name: "rule 6: malformed TOML",
    zip: () => zipOf(baseFiles({ manifestToml: "this = is [ not valid toml" })),
    status: 400,
    message: /^manifest\.toml is not valid TOML: /,
  },
  {
    name: "rule 7: missing required field (description)",
    zip: () => zipOf(baseFiles({ manifestFields: { description: undefined } })),
    status: 400,
    message: /^manifest\.toml is missing required field: description$/,
  },
  {
    name: "rule 7: missing required field (empty id)",
    zip: () => zipOf(baseFiles({ manifestFields: { id: "" } })),
    status: 400,
    message: /^manifest\.toml is missing required field: id$/,
  },
  {
    name: "rule 8: invalid id shape",
    zip: () => zipOf(baseFiles({ manifestFields: { id: "Not_Valid!" } })),
    status: 400,
    message: /^manifest\.toml id must be lowercase alphanumeric with \. _ -$/,
  },
  {
    name: "rule 9: runtime module points to a missing entry",
    zip: () => zipOf(baseFiles({ manifestFields: { runtimeModule: "wasm/missing.wasm" } })),
    status: 400,
    message:
      /^manifest\.toml \[runtime\]\.module points to "wasm\/missing\.wasm", which is not in the zip$/,
  },
  {
    name: "rule 9: runtime module absent from the manifest entirely",
    zip: () => zipOf(baseFiles({ manifestFields: { runtimeModule: undefined } })),
    status: 400,
    message: /^manifest\.toml \[runtime\]\.module points to "", which is not in the zip$/,
  },
  {
    name: "rule 10: zero capabilities files",
    zip: () => {
      const files = baseFiles()
      delete files["test-tool.capabilities.json"]
      return zipOf(files)
    },
    status: 400,
    message: /^Zip must contain exactly one \*\.capabilities\.json at its root \(found 0\)$/,
  },
  {
    name: "rule 10: multiple capabilities files",
    zip: () =>
      zipOf({ ...baseFiles(), "other-tool.capabilities.json": encode("{}") }),
    status: 400,
    message: /^Zip must contain exactly one \*\.capabilities\.json at its root \(found 2\)$/,
  },
  {
    name: "rule 10: capabilities file is not valid JSON",
    zip: () => zipOf(baseFiles({ capabilitiesBytes: encode("{ not json") })),
    status: 400,
    message: /^test-tool\.capabilities\.json is not valid JSON$/,
  },
]

for (const testCase of rejectionCases) {
  test(testCase.name, async () => {
    await assertRejection(testCase.zip(), testCase.status, testCase.message)
  })
}
