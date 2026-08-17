import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import test from "node:test"

import { zipSync } from "fflate"

import {
  __setInflateInputChunkListenerForTests,
  __setInflateOutputTotalListenerForTests,
  inspectExtensionBundle,
  readBundleFile,
} from "./bundle.ts"
import { MAX_CONTENT_BYTES_BY_KIND } from "./content.ts"
import { buildRawZipArchive, crc32 as rawCrc32, encode } from "./zip-test-support.mjs"

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

test("accepts a bundle with no *.capabilities.json at all -- manifest.toml now owns that data (design.md D3/D6)", () => {
  const files = baseFiles()
  delete files["test-tool.capabilities.json"]
  const zip = zipOf(files)

  const inspected = inspectExtensionBundle(zip)

  assert.equal(inspected.capabilitiesPath, null)
  assert.equal(inspected.manifest.id, "test-tool")
  assert.equal(inspected.wasmPath, "wasm/test.wasm")
})

test("readBundleFile reads back the resolved wasm module", () => {
  const zip = zipOf(baseFiles())
  const bytes = readBundleFile(zip, "wasm/test.wasm")
  assert.deepEqual(Array.from(bytes), [0, 97, 115, 109, 1, 0, 0, 0])
})

test("readBundleFile throws a 400 Response for a path not in the zip", async () => {
  const zip = zipOf(baseFiles())
  let threw = false
  try {
    readBundleFile(zip, "does/not/exist")
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip entry not found: does\/not\/exist$/)
  }
  assert.ok(threw, "expected readBundleFile to throw")
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
    message: /^manifest\.toml is missing required field: \[runtime\]\.module$/,
  },
  {
    name: "rule 10: multiple capabilities files",
    zip: () =>
      zipOf({ ...baseFiles(), "other-tool.capabilities.json": encode("{}") }),
    status: 400,
    message: /^Zip must contain at most one \*\.capabilities\.json at its root \(found 2\)$/,
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

// --- Low-level central-directory patching -----------------------------------
//
// fflate's zipSync cannot produce a forged/malicious zip on its own (wrong
// declared sizes, unsupported compression methods, encryption flags, zip64
// sentinels). The tests below build a real archive with zipSync and then
// binary-patch specific central-directory fields, mirroring exactly what an
// attacker controls: the archive's own metadata, independent of what the
// compressed bytes actually decode to.

function readU16LE(zip, offset) {
  return zip[offset] | (zip[offset + 1] << 8)
}

function readU32LE(zip, offset) {
  return (
    (zip[offset] |
      (zip[offset + 1] << 8) |
      (zip[offset + 2] << 16) |
      (zip[offset + 3] << 24)) >>>
    0
  )
}

function writeU16LE(zip, offset, value) {
  zip[offset] = value & 0xff
  zip[offset + 1] = (value >> 8) & 0xff
}

function writeU32LE(zip, offset, value) {
  zip[offset] = value & 0xff
  zip[offset + 1] = (value >>> 8) & 0xff
  zip[offset + 2] = (value >>> 16) & 0xff
  zip[offset + 3] = (value >>> 24) & 0xff
}

// Locates a central-directory record's start offset by entry name, walking
// the directory the same way bundle.ts's own listZipEntries does.
function findCentralDirectoryOffset(zip, entryName) {
  let e = zip.length - 22
  while (readU32LE(zip, e) !== 0x06054b50) e--
  const count = readU16LE(zip, e + 10)
  let offset = readU32LE(zip, e + 16)
  for (let i = 0; i < count; i++) {
    const nameLength = readU16LE(zip, offset + 28)
    const extraLength = readU16LE(zip, offset + 30)
    const commentLength = readU16LE(zip, offset + 32)
    const name = new TextDecoder().decode(zip.subarray(offset + 46, offset + 46 + nameLength))
    if (name === entryName) return offset
    offset += 46 + nameLength + extraLength + commentLength
  }
  throw new Error(`central directory entry not found: ${entryName}`)
}

// --- Rule 3b: unsupported compression method / encrypted entries -----------

test("rule 3b: unsupported compression method message names the entry", async () => {
  const zip = zipOf({ ...baseFiles(), "evil.bin": encode("payload") })
  const offset = findCentralDirectoryOffset(zip, "evil.bin")
  writeU16LE(zip, offset + 10, 12) // bzip2 -- fflate cannot decode this
  await assertRejection(
    zip,
    400,
    /^Zip entry uses an unsupported compression method: evil\.bin$/
  )
})

test("rule 3b: an encrypted entry is rejected during inspect, not at upload", async () => {
  const zip = zipOf({ ...baseFiles(), "evil.bin": encode("payload") })
  const offset = findCentralDirectoryOffset(zip, "evil.bin")
  const flags = readU16LE(zip, offset + 8)
  writeU16LE(zip, offset + 8, flags | 0x0001) // general-purpose bit 0: encrypted
  await assertRejection(zip, 400, /^Zip entries must not be encrypted: evil\.bin$/)
})

test("ordering: unsafe entry path (rule 3) fires before unsupported compression method (rule 3b)", async () => {
  // A single entry that is both unsafely named (".." segment) and uses an
  // unsupported compression method. Rule 3 runs before rule 3b, so the
  // unsafe-path message must win, not the compression-method message.
  const zip = zipOf({ ...baseFiles(), "../escape.bin": encode("payload") })
  const offset = findCentralDirectoryOffset(zip, "../escape.bin")
  writeU16LE(zip, offset + 10, 12) // bzip2 -- also unsupported, but must not win
  await assertRejection(zip, 400, /^Zip contains an unsafe entry path: \.\.\/escape\.bin$/)
})

// --- Declared size / crc32 vs. actual extracted bytes -----------------------

test("readBundleFile rejects a declared size smaller than the real decompressed content", async () => {
  // A real, fully compressible 100-byte payload; fflate would happily
  // truncate its inflate output to whatever size we declare, so declaring 10
  // must be caught by readBundleFile even though fflate itself never errors.
  const payload = new Uint8Array(100)
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251
  const zip = zipOf({ ...baseFiles(), "wasm/big.wasm": payload }, { level: 6 })
  const offset = findCentralDirectoryOffset(zip, "wasm/big.wasm")
  writeU32LE(zip, offset + 24, 10) // declared uncompressed size: 10, real: 100

  let threw = false
  try {
    readBundleFile(zip, "wasm/big.wasm")
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip entry wasm\/big\.wasm does not match its declared size or checksum$/)
  }
  assert.ok(threw, "expected readBundleFile to throw")
})

test("readBundleFile rejects a declared-zero entry that actually decompresses to real content", async () => {
  const payload = new Uint8Array(100)
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251
  const zip = zipOf({ ...baseFiles(), "wasm/big.wasm": payload }, { level: 6 })
  const offset = findCentralDirectoryOffset(zip, "wasm/big.wasm")
  writeU32LE(zip, offset + 24, 0) // declared uncompressed size: 0 (legal, forged)

  // fflate returns a genuinely empty (but still object-typed, truthy)
  // Uint8Array here -- an `if (!bytes)` truthiness guard would never catch
  // this. The explicit length/crc32 check must.
  let threw = false
  try {
    readBundleFile(zip, "wasm/big.wasm")
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip entry wasm\/big\.wasm does not match its declared size or checksum$/)
  }
  assert.ok(threw, "expected readBundleFile to throw")
})

test("readBundleFile rejects a crc32 mismatch even when the declared length is correct", async () => {
  const zip = zipOf(baseFiles())
  const offset = findCentralDirectoryOffset(zip, "wasm/test.wasm")
  const originalCrc = readU32LE(zip, offset + 16)
  writeU32LE(zip, offset + 16, (originalCrc ^ 0xffffffff) >>> 0) // corrupt only the crc32

  let threw = false
  try {
    readBundleFile(zip, "wasm/test.wasm")
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip entry wasm\/test\.wasm does not match its declared size or checksum$/)
  }
  assert.ok(threw, "expected readBundleFile to throw on crc32 mismatch")
})

test("a corrupted wasm module is caught during inspect itself (rule 3c), not deferred to upload", async () => {
  // Rule 3c: inspect now resolves and verifies wasm/capabilities/manifest_toml
  // the same way upload does, so a corrupted module never inspects clean.
  const payload = new Uint8Array(100)
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251
  const zip = zipOf({ ...baseFiles(), "wasm/test.wasm": payload }, { level: 6 })
  const offset = findCentralDirectoryOffset(zip, "wasm/test.wasm")
  writeU32LE(zip, offset + 24, 0) // forge the module's declared size to 0

  await assertRejection(
    zip,
    400,
    /^Zip entry wasm\/test\.wasm does not match its declared size or checksum$/
  )
  // readBundleFile independently catches the same corruption -- the route
  // never trusts inspect and re-extracts from scratch.
  let threw = false
  try {
    readBundleFile(zip, "wasm/test.wasm")
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip entry wasm\/test\.wasm does not match its declared size or checksum$/)
  }
  assert.ok(threw, "expected readBundleFile to throw")
})

// --- Zip64: full 64-bit declared sizes, only honoured with a locator ------
//
// These archives are load-bearing: each one includes a real, parseable
// manifest.toml (and capabilities.json) so the wasm entry is actually
// resolved and read via extractVerifiedEntry, the same path a real inspect
// call takes. A fixture with no manifest.toml never gets that far in either
// a correct or a broken implementation, which would make it pass vacuously.

function rawBundleEntries(overrides = {}) {
  return [
    { name: "manifest.toml", content: encode(manifestToml(overrides.manifestFields)), method: 0 },
    {
      name: "test-tool.capabilities.json",
      content: encode(JSON.stringify({ version: "0.1.0" })),
      method: 0,
    },
  ]
}

function assertNoLargeAllocation(before, after) {
  const arrayBufferGrowth = after.arrayBuffers - before.arrayBuffers
  const rssGrowth = after.rss - before.rss
  assert.ok(
    arrayBufferGrowth < 50 * 1024 * 1024,
    `expected no large-buffer allocation, but arrayBuffers grew by ${arrayBufferGrowth} bytes`
  )
  assert.ok(
    rssGrowth < 200 * 1024 * 1024,
    `expected no large RSS growth, but rss grew by ${rssGrowth} bytes`
  )
}

test("zip64 no-locator bomb: a lying small size in an ignored zip64 extra field is rejected, not honoured", async () => {
  // The wasm entry's fixed central-directory fields are the zip64 sentinel
  // (0xFFFFFFFF), and its zip64 extra field lies "100 bytes" -- but there is
  // no zip64 EOCD locator anywhere in the archive. fflate only ever
  // consults a per-entry zip64 extra field when a locator is present
  // (fflate/esm/index.mjs: `if (z && nf)`); without one it keeps the raw
  // sentinel. bundle.ts must mirror that gate exactly, or it sees the small
  // lie, passes every cap, and fflate (with no locator) allocates ~4.29GB.
  const wasmContent = new Uint8Array(2000)
  for (let i = 0; i < wasmContent.length; i++) wasmContent[i] = i % 251

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      ...rawBundleEntries(),
      {
        name: "wasm/test.wasm",
        content: wasmContent,
        method: 8,
        forceZip64Extra: true,
        declaredUncompressedSize: 100, // the lie
        declaredCompressedSize: 100,
      },
    ],
  })
  assert.ok(zip.length < 2000, `expected a tiny archive on the wire, got ${zip.length} bytes`)

  const before = process.memoryUsage()
  let threw = false
  try {
    inspectExtensionBundle(zip)
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip archive is too large \(max 100MB uncompressed\)$/)
  }
  assert.ok(threw, "expected inspectExtensionBundle to throw")
  assertNoLargeAllocation(before, process.memoryUsage())
})

test("zip64 no-locator bomb: rejection message is the total-uncompressed cap message", async () => {
  const wasmContent = new Uint8Array(2000)
  for (let i = 0; i < wasmContent.length; i++) wasmContent[i] = i % 251

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      ...rawBundleEntries(),
      {
        name: "wasm/test.wasm",
        content: wasmContent,
        method: 8,
        forceZip64Extra: true,
        declaredUncompressedSize: 100,
        declaredCompressedSize: 100,
      },
    ],
  })
  await assertRejection(zip, 400, /^Zip archive is too large \(max 100MB uncompressed\)$/)
})

test("zip64 no-locator, 'accepted' variant: declaring the entry's true (honest) size still gets rejected", async () => {
  // Same no-locator shape, but the zip64 extra field declares its real,
  // honest size (not an arbitrary lie) -- proving the fix rejects because
  // there is no locator at all, regardless of what story the (ignored)
  // extra field tells.
  const wasmContent = new Uint8Array(2000)
  for (let i = 0; i < wasmContent.length; i++) wasmContent[i] = i % 251

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      ...rawBundleEntries(),
      {
        name: "wasm/test.wasm",
        content: wasmContent,
        method: 8,
        forceZip64Extra: true,
        declaredUncompressedSize: wasmContent.length, // honest
        declaredCompressedSize: wasmContent.length,
      },
    ],
  })

  const before = process.memoryUsage()
  let threw = false
  try {
    inspectExtensionBundle(zip)
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Zip archive is too large \(max 100MB uncompressed\)$/)
  }
  assert.ok(threw, "expected inspectExtensionBundle to throw")
  assertNoLargeAllocation(before, process.memoryUsage())
})

// --- T1/T2/T3: crc-consistent truncation (declared size and crc32 are both
// attacker-supplied, so comparing them to each other alone proves nothing) -

test("T1: declared 64 bytes + crc32 of only the first 64 real bytes, real stream 6MB", async () => {
  const realContent = new Uint8Array(6 * 1024 * 1024)
  for (let i = 0; i < realContent.length; i++) realContent[i] = i % 251

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      ...rawBundleEntries(),
      {
        name: "wasm/test.wasm",
        content: realContent,
        method: 8,
        declaredUncompressedSize: 64,
        declaredCrc32: rawCrc32(realContent.subarray(0, 64)), // crc of the truncated prefix
      },
    ],
  })

  const before = process.memoryUsage()
  await assertRejection(
    zip,
    400,
    /^Zip entry wasm\/test\.wasm does not match its declared size or checksum$/
  )
  assertNoLargeAllocation(before, process.memoryUsage())
})

test("T2: declared 0 bytes + crc32(empty)=0, real stream 6MB", async () => {
  const realContent = new Uint8Array(6 * 1024 * 1024)
  for (let i = 0; i < realContent.length; i++) realContent[i] = (i * 7) % 251

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      ...rawBundleEntries(),
      {
        name: "wasm/test.wasm",
        content: realContent,
        method: 8,
        declaredUncompressedSize: 0,
        declaredCrc32: 0,
      },
    ],
  })

  const before = process.memoryUsage()
  await assertRejection(
    zip,
    400,
    /^Zip entry wasm\/test\.wasm does not match its declared size or checksum$/
  )
  assertNoLargeAllocation(before, process.memoryUsage())
})

test("T3: capabilities.json truncated to a still-valid JSON prefix is rejected, not accepted as valid JSON", async () => {
  // Real content is a valid JSON object immediately followed by 6MB of
  // padding bytes. The declared size/crc32 are computed from that exact
  // JSON-object-length prefix of the real content (not a separately
  // re-serialized value), so a naive "does the truncated result parse as
  // JSON" check would accept it -- it does parse, just as the wrong object.
  const jsonPrefix = encode(JSON.stringify({ a: 1, b: 2 }))
  const padding = new Uint8Array(6 * 1024 * 1024)
  for (let i = 0; i < padding.length; i++) padding[i] = i % 251
  const realCapabilities = new Uint8Array(jsonPrefix.length + padding.length)
  realCapabilities.set(jsonPrefix, 0)
  realCapabilities.set(padding, jsonPrefix.length)

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      { name: "manifest.toml", content: encode(manifestToml()), method: 0 },
      {
        name: "test-tool.capabilities.json",
        content: realCapabilities,
        method: 8,
        declaredUncompressedSize: jsonPrefix.length,
        declaredCrc32: rawCrc32(realCapabilities.subarray(0, jsonPrefix.length)),
      },
      { name: "wasm/test.wasm", content: new Uint8Array([1, 2, 3, 4]), method: 0 },
    ],
  })

  await assertRejection(
    zip,
    400,
    /^Zip entry test-tool\.capabilities\.json does not match its declared size or checksum$/
  )
})

// --- Fix 8: [runtime].module must resolve to a *visible* entry -------------

test("a [runtime].module pointing at a stripped __MACOSX/ entry is rejected, not silently accepted", async () => {
  const zip = zipOf({
    ...baseFiles({ manifestFields: { runtimeModule: "__MACOSX/._fake.wasm" } }),
    "__MACOSX/._fake.wasm": new Uint8Array([1, 2, 3]),
  })
  await assertRejection(
    zip,
    400,
    /^manifest\.toml \[runtime\]\.module points to "__MACOSX\/\._fake\.wasm", which is not in the zip$/
  )
})

// --- Rule 10 root-only re-check: nested capabilities files don't count -----

test("a *.capabilities.json only under schemas/ counts as zero root capabilities files -- accepted, not a rejection", () => {
  // Zero root-level matches is a legitimate state (design.md D3/D6): the
  // nested file is simply invisible to rule 10, not miscounted as "found 1".
  const files = baseFiles()
  delete files["test-tool.capabilities.json"]
  files["schemas/test-tool.capabilities.json"] = encode(JSON.stringify({ version: "0.1.0" }))
  const zip = zipOf(files)

  const inspected = inspectExtensionBundle(zip)

  assert.equal(inspected.capabilitiesPath, null)
})

// --- Two simultaneous rule violations: the earlier rule wins ---------------

test("ordering: total-uncompressed cap fires before per-entry cap when both are violated", async () => {
  // Five 26MB entries: each individually breaks the 25MB per-entry cap, and
  // together they also break the 100MB total cap. D6 says total is checked
  // before per-entry, so the total message must win.
  const files = { ...baseFiles() }
  for (let i = 0; i < 5; i++) {
    files[`schemas/pad-${i}.bin`] = new Uint8Array(26 * 1024 * 1024)
  }
  const zip = zipOf(files, { level: 1 })
  await assertRejection(zip, 400, /^Zip archive is too large \(max 100MB uncompressed\)$/)
})

test("ordering: unsafe entry path (rule 3) fires before wrapper-directory (rule 4)", async () => {
  // Every entry shares the "firecrawl" top-level segment (a wrapper-folder
  // violation), but one entry's full name also contains a ".." segment (an
  // unsafe-path violation). Rule 3 runs before rule 4, so the unsafe-path
  // message must win even though the archive would also fail rule 4.
  const wrapped = {}
  for (const [name, bytes] of Object.entries(baseFiles())) {
    wrapped[`firecrawl/${name}`] = bytes
  }
  wrapped["firecrawl/../evil.bin"] = encode("x")
  const zip = zipOf(wrapped)
  await assertRejection(zip, 400, /^Zip contains an unsafe entry path: firecrawl\/\.\.\/evil\.bin$/)
})

// --- Rule 3c: D3 per-kind caps enforced during inspect, not just upload ----

test("rule 3c: a wasm module over content.ts's real D3 cap is rejected during inspect", async () => {
  // Uses content.ts's *real* exported table, not a hand-copied number, so
  // this fails if bundle.ts's internal MAX_KIND_BYTES_DURING_INSPECT table
  // ever drifts from design.md D3's source of truth.
  const oversized = new Uint8Array(MAX_CONTENT_BYTES_BY_KIND.wasm + 1)
  for (let i = 0; i < oversized.length; i++) oversized[i] = i % 251
  const zip = zipOf({ ...baseFiles({ wasmBytes: undefined }), "wasm/test.wasm": oversized })
  await assertRejection(
    zip,
    400,
    new RegExp(
      `^Content exceeds the ${MAX_CONTENT_BYTES_BY_KIND.wasm / (1024 * 1024)}MB limit for wasm$`
    )
  )
})

test("rule 3c: a manifest.toml over content.ts's real D3 cap is rejected during inspect", async () => {
  const padding = " ".repeat(MAX_CONTENT_BYTES_BY_KIND.manifest_toml)
  const oversizedToml = manifestToml() + `# ${padding}\n`
  const zip = zipOf(baseFiles({ manifestToml: oversizedToml }))
  await assertRejection(
    zip,
    400,
    new RegExp(
      `^Content exceeds the ${MAX_CONTENT_BYTES_BY_KIND.manifest_toml / 1024}KB limit for manifest_toml$`
    )
  )
})

// --- O(n^2) fix: input fed to the deflate decoder must be bounded by the --
// entry's compressed size, not the whole archive remainder (blocker: a
// legitimate multi-MB bundle in the natural tools/firecrawl layout --
// manifest.toml, then wasm, then bulk prompts/schemas -- used to cost tens
// of seconds of CPU per extracted entry, because every entry after the
// first fed the *entire rest of the archive* to the decoder one 16KB chunk
// at a time, and fflate's pending-input buffer is copied in full on every
// push. A deterministic byte-count invariant is used here rather than
// timing, so this cannot be flaky.

// Deliberately not a simple repeating pattern (avoids one 16KB input chunk
// decoding to an unrealistically huge output chunk and confusing the
// byte-count assertions below with an extreme compression ratio).
// A real CSPRNG, not a hand-rolled generator: a naive LCG (e.g.
// `state = state * a + c`) has short-range bit correlations that DEFLATE's
// LZ77 window exploits heavily -- an earlier version of this content
// compressed 7.3MB down to ~45KB and, worse, decoded a single 16KB input
// chunk into multiple MB of output in one synchronous call, which defeats
// the point of these tests (they need per-chunk output roughly proportional
// to per-chunk input to make the byte-count/peak-output assertions below
// meaningful). crypto.randomBytes is incompressible in practice.
function pseudoRandomBytes(length) {
  return new Uint8Array(randomBytes(length))
}

test("O(n^2) fix: bytes fed to the deflate decoder are bounded by the entry's compressed size", () => {
  const wasmContent = pseudoRandomBytes(50000)
  // Several MB of bulk data placed *after* the target entry -- the natural
  // tools/firecrawl layout (manifest.toml, wasm, then prompts/schemas), and
  // exactly the shape that triggered the quadratic blowup: the bug only
  // shows up when what remains after the target entry's data is much
  // larger than the entry's own compressed data.
  const bulk = pseudoRandomBytes(3 * 1024 * 1024)

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      { name: "manifest.toml", content: encode(manifestToml()), method: 0 },
      {
        name: "test-tool.capabilities.json",
        content: encode(JSON.stringify({ version: "0.1.0" })),
        method: 0,
      },
      { name: "wasm/test.wasm", content: wasmContent, method: 8 },
      { name: "prompts/bulk.bin", content: bulk, method: 8 },
    ],
  })

  let totalFed = 0
  __setInflateInputChunkListenerForTests((byteLength) => {
    totalFed += byteLength
  })
  let bytes
  try {
    bytes = readBundleFile(zip, "wasm/test.wasm")
  } finally {
    __setInflateInputChunkListenerForTests(null)
  }

  assert.deepEqual(Array.from(bytes), Array.from(wasmContent))
  // Bounded by roughly the entry's own compressed data, plus at most a
  // couple of 16KB input-chunking increments of slack -- not by the ~3MB of
  // bulk data that follows it in the archive.
  assert.ok(
    totalFed < 200 * 1024,
    `expected input fed (${totalFed} bytes) to be bounded by the entry's own compressed size, not the ~3MB archive remainder that follows it`
  )
})

test("O(n^2) fix: inspecting a natural-layout multi-MB bundle stays fast (coarse timing guard, secondary to the byte-count assertion above)", () => {
  const wasmContent = pseudoRandomBytes(1024 * 1024)
  const bulk = pseudoRandomBytes(10 * 1024 * 1024)

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      { name: "manifest.toml", content: encode(manifestToml()), method: 0 },
      {
        name: "test-tool.capabilities.json",
        content: encode(JSON.stringify({ version: "0.1.0" })),
        method: 0,
      },
      { name: "wasm/test.wasm", content: wasmContent, method: 8 },
      { name: "prompts/bulk.bin", content: bulk, method: 8 },
    ],
  })

  const start = Date.now()
  inspectExtensionBundle(zip)
  const elapsed = Date.now() - start
  // Generous threshold: the quadratic version took multiple *seconds* even
  // on a ~9MB archive and tens of seconds on ~21MB. This only needs to
  // catch a real regression, not assert a tight budget.
  assert.ok(elapsed < 3000, `expected inspect to complete in well under 3s, took ${elapsed}ms`)
})

// --- Mutation guards: three D6 guards a prior review found had no test ----
// that would fail if they were silently weakened or removed.

test("mutation guard M3: a genuinely empty (zero-length) wasm module is rejected even though declared size/crc are self-consistent", async () => {
  // declaredUncompressedSize defaults to content.length (0) and
  // declaredCrc32 defaults to crc32(empty) (0) -- fully self-consistent
  // with the real (also empty) content, so only an explicit zero-length
  // check catches this, not the length/crc comparison.
  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [...rawBundleEntries(), { name: "wasm/test.wasm", content: new Uint8Array(0), method: 0 }],
  })
  await assertRejection(
    zip,
    400,
    /^Zip entry wasm\/test\.wasm does not match its declared size or checksum$/
  )
})

test("mutation guard M5: extraction budget is min(declared, cap), not declared alone -- peak accumulated output stays within the kind cap", async () => {
  // An honest wasm entry whose declared AND real size both exceed the wasm
  // per-kind cap. If the budget were `declared` alone (unclamped by
  // maxBytes), extraction would accumulate output all the way up toward
  // the full oversized content before any check fires. With the correct
  // min(declared, cap) budget, accumulation must abort once it exceeds the
  // cap, never growing much past cap + 1.
  const oversized = pseudoRandomBytes(MAX_CONTENT_BYTES_BY_KIND.wasm + 2 * 1024 * 1024)

  const zip = buildRawZipArchive({
    includeZip64Locator: false,
    entries: [
      { name: "manifest.toml", content: encode(manifestToml()), method: 0 },
      {
        name: "test-tool.capabilities.json",
        content: encode(JSON.stringify({ version: "0.1.0" })),
        method: 0,
      },
      { name: "wasm/test.wasm", content: oversized, method: 8 },
    ],
  })

  let peakOutput = 0
  __setInflateOutputTotalListenerForTests((total) => {
    if (total > peakOutput) peakOutput = total
  })
  let threw = false
  try {
    inspectExtensionBundle(zip)
  } catch (error) {
    threw = true
    assert.ok(error instanceof Response)
    assert.equal(error.status, 400)
    const text = await error.text()
    assert.match(text, /^Content exceeds the 5MB limit for wasm$/)
  } finally {
    __setInflateOutputTotalListenerForTests(null)
  }
  assert.ok(threw, "expected inspectExtensionBundle to throw")

  // Slack accounts for 16KB input-chunk granularity against low-entropy
  // pseudo-random content (a few chunks' worth of overshoot, at most), not
  // for accumulating anywhere close to the full ~7.2MB of real content --
  // if the mutation this guards against were reintroduced, peakOutput would
  // grow to within a chunk of the full oversized.length (2MB above this
  // tolerance), so this assertion would fail.
  assert.ok(
    peakOutput <= MAX_CONTENT_BYTES_BY_KIND.wasm + 64 * 1024,
    `expected peak accumulated output (${peakOutput} bytes) to stay near the wasm cap (${MAX_CONTENT_BYTES_BY_KIND.wasm} bytes), not grow toward the full declared/real size (${oversized.length} bytes)`
  )
})
