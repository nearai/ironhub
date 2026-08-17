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
    message: /^manifest\.toml is missing required field: \[runtime\]\.module$/,
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

// --- Rule 2b: unsupported compression method / encrypted entries -----------

test("rule 2b: unsupported compression method message names the entry", async () => {
  const zip = zipOf({ ...baseFiles(), "evil.bin": encode("payload") })
  const offset = findCentralDirectoryOffset(zip, "evil.bin")
  writeU16LE(zip, offset + 10, 12) // bzip2 -- fflate cannot decode this
  await assertRejection(
    zip,
    400,
    /^Zip entry uses an unsupported compression method: evil\.bin$/
  )
})

test("rule 2b: an encrypted entry is rejected during inspect, not at upload", async () => {
  const zip = zipOf({ ...baseFiles(), "evil.bin": encode("payload") })
  const offset = findCentralDirectoryOffset(zip, "evil.bin")
  const flags = readU16LE(zip, offset + 8)
  writeU16LE(zip, offset + 8, flags | 0x0001) // general-purpose bit 0: encrypted
  await assertRejection(zip, 400, /^Zip entries must not be encrypted: evil\.bin$/)
})

// --- Declared size / crc32 vs. actual extracted bytes -----------------------

test("readBundleFile rejects a declared size smaller than the real decompressed content", () => {
  // A real, fully compressible 100-byte payload; fflate would happily
  // truncate its inflate output to whatever size we declare, so declaring 10
  // must be caught by readBundleFile even though fflate itself never errors.
  const payload = new Uint8Array(100)
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251
  const zip = zipOf({ ...baseFiles(), "wasm/big.wasm": payload }, { level: 6 })
  const offset = findCentralDirectoryOffset(zip, "wasm/big.wasm")
  writeU32LE(zip, offset + 24, 10) // declared uncompressed size: 10, real: 100

  assert.throws(
    () => readBundleFile(zip, "wasm/big.wasm"),
    (error) =>
      error instanceof Response &&
      error.status === 400
  )
})

test("readBundleFile rejects a declared-zero entry that actually decompresses to real content", () => {
  const payload = new Uint8Array(100)
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251
  const zip = zipOf({ ...baseFiles(), "wasm/big.wasm": payload }, { level: 6 })
  const offset = findCentralDirectoryOffset(zip, "wasm/big.wasm")
  writeU32LE(zip, offset + 24, 0) // declared uncompressed size: 0 (legal, forged)

  // fflate returns a genuinely empty (but still object-typed, truthy)
  // Uint8Array here -- an `if (!bytes)` truthiness guard would never catch
  // this. The explicit length/crc32 check must.
  assert.throws(
    () => readBundleFile(zip, "wasm/big.wasm"),
    (error) => {
      assert.ok(error instanceof Response)
      assert.equal(error.status, 400)
      return true
    }
  )
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

test("a corrupted wasm module fails at upload-time extraction, not silently as a 0-byte artifact", () => {
  // End-to-end version of the above via inspectExtensionBundle + readBundleFile,
  // the same sequence [id]/bundle/route.ts runs: the manifest resolves the
  // module path, but reading it back must still catch the corruption.
  const payload = new Uint8Array(100)
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251
  const zip = zipOf({ ...baseFiles(), "wasm/test.wasm": payload }, { level: 6 })
  const offset = findCentralDirectoryOffset(zip, "wasm/test.wasm")
  writeU32LE(zip, offset + 24, 0) // forge the module's declared size to 0

  const inspected = inspectExtensionBundle(zip) // rules 1-10 don't read wasm bytes
  assert.equal(inspected.wasmPath, "wasm/test.wasm")
  assert.throws(
    () => readBundleFile(zip, inspected.wasmPath),
    (error) => error instanceof Response && error.status === 400
  )
})

// --- Zip64: full 64-bit declared sizes, not truncated to the low dword -----

function u32Bytes(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]
}

/**
 * Hand-builds a minimal zip64 archive with a single entry whose central
 * directory declares an uncompressed size of 2**32 + 100 -- unrepresentable
 * in the fixed 32-bit field, so it's encoded via the zip64 extra field the
 * way a real archiver (or an attacker) would. fflate cannot be asked to
 * produce this via zipSync, so this is built by hand from the raw APPNOTE
 * layout. The actual "compressed data" bytes are never read by a correctly
 * behaving validator (rejection must happen from central-directory metadata
 * alone), so they're a few throwaway bytes.
 */
function buildZip64BombArchive() {
  const name = encode("bomb.bin")
  const fakeCompressedData = new Uint8Array([0, 0, 0, 0])
  const declaredUncompressedLow = 100
  const declaredUncompressedHigh = 1 // total: 2**32 + 100
  const declaredCompressedLow = fakeCompressedData.length
  const declaredCompressedHigh = 0

  const localHeader = new Uint8Array(30)
  writeU32LE(localHeader, 0, 0x04034b50) // local file header signature
  writeU16LE(localHeader, 4, 20) // version needed
  writeU16LE(localHeader, 6, 0) // general purpose flag
  writeU16LE(localHeader, 8, 8) // method: deflate
  writeU32LE(localHeader, 10, 0) // mod time/date
  writeU32LE(localHeader, 14, 0) // crc32 (unused -- rejection happens before any read)
  writeU32LE(localHeader, 18, fakeCompressedData.length) // compressed size (local, unused)
  writeU32LE(localHeader, 22, 0) // uncompressed size (local, unused)
  writeU16LE(localHeader, 26, name.length)
  writeU16LE(localHeader, 28, 0) // extra length

  const localHeaderOffset = 0
  const dataOffset = localHeader.length + name.length
  const centralDirOffset = dataOffset + fakeCompressedData.length

  const zip64Extra = new Uint8Array([
    1, 0, // tag: zip64 extended information
    16, 0, // size: two 8-byte fields (uncompressed, then compressed)
    ...u32Bytes(declaredUncompressedLow),
    ...u32Bytes(declaredUncompressedHigh),
    ...u32Bytes(declaredCompressedLow),
    ...u32Bytes(declaredCompressedHigh),
  ])

  const centralHeader = new Uint8Array(46)
  writeU32LE(centralHeader, 0, 0x02014b50)
  writeU16LE(centralHeader, 4, 0x0314) // version made by: unix
  writeU16LE(centralHeader, 6, 45) // version needed: zip64
  writeU16LE(centralHeader, 8, 0) // general purpose flag
  writeU16LE(centralHeader, 10, 8) // method: deflate
  writeU32LE(centralHeader, 16, 0) // crc32 (unused)
  writeU32LE(centralHeader, 20, 0xffffffff) // compressed size sentinel
  writeU32LE(centralHeader, 24, 0xffffffff) // uncompressed size sentinel
  writeU16LE(centralHeader, 28, name.length)
  writeU16LE(centralHeader, 30, zip64Extra.length)
  writeU16LE(centralHeader, 32, 0) // comment length
  writeU16LE(centralHeader, 34, 0) // disk number start
  writeU16LE(centralHeader, 36, 0) // internal attrs
  writeU32LE(centralHeader, 38, 0) // external attrs
  writeU32LE(centralHeader, 42, localHeaderOffset)

  const centralDirSize = centralHeader.length + name.length + zip64Extra.length
  const eocd = new Uint8Array(22)
  writeU32LE(eocd, 0, 0x06054b50)
  writeU16LE(eocd, 4, 0) // disk number
  writeU16LE(eocd, 6, 0) // disk with central dir
  writeU16LE(eocd, 8, 1) // entries on this disk
  writeU16LE(eocd, 10, 1) // total entries
  writeU32LE(eocd, 16, centralDirOffset)
  writeU32LE(eocd, 12, centralDirSize)
  writeU16LE(eocd, 20, 0) // comment length

  const parts = [localHeader, name, fakeCompressedData, centralHeader, name, zip64Extra, eocd]
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

test("zip64 bomb: a small archive declaring a >4GB uncompressed size is rejected without a matching allocation", () => {
  const zip = buildZip64BombArchive()
  assert.ok(zip.length < 300, `expected a tiny archive on the wire, got ${zip.length} bytes`)

  const before = process.memoryUsage()

  let rejected = false
  let status
  try {
    inspectExtensionBundle(zip)
  } catch (error) {
    rejected = true
    if (error instanceof Response) {
      status = error.status
    }
  }

  const after = process.memoryUsage()
  const arrayBufferGrowth = after.arrayBuffers - before.arrayBuffers
  const heapGrowth = after.rss - before.rss

  assert.ok(rejected, "expected inspectExtensionBundle to reject the zip64 bomb")
  assert.equal(status, 400)
  // The real bug this guards against allocated hundreds of MB to multiple
  // GB (fflate preallocating `new u8(su)` from the forged declared size).
  // A correct fix rejects from central-directory metadata alone, before any
  // allocation sized by that declared value ever happens.
  assert.ok(
    arrayBufferGrowth < 50 * 1024 * 1024,
    `expected no large-buffer allocation, but arrayBuffers grew by ${arrayBufferGrowth} bytes`
  )
  assert.ok(
    heapGrowth < 200 * 1024 * 1024,
    `expected no large RSS growth, but rss grew by ${heapGrowth} bytes`
  )
})

test("zip64 bomb: the rejection message is the total-uncompressed cap message", async () => {
  const zip = buildZip64BombArchive()
  await assertRejection(zip, 400, /^Zip archive is too large \(max 100MB uncompressed\)$/)
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

test("a *.capabilities.json only under schemas/ counts as zero root capabilities files", async () => {
  const files = baseFiles()
  delete files["test-tool.capabilities.json"]
  files["schemas/test-tool.capabilities.json"] = encode(JSON.stringify({ version: "0.1.0" }))
  const zip = zipOf(files)
  await assertRejection(
    zip,
    400,
    /^Zip must contain exactly one \*\.capabilities\.json at its root \(found 0\)$/
  )
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
