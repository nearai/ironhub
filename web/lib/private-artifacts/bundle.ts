// Extension bundle ingest (design.md D6). This module is pure and
// unit-testable: no HTTP, no Prisma, no storage. It only knows how to read
// and validate an untrusted zip archive uploaded by an org member.
//
// Every validation rule below runs in the exact order specified by D6 --
// first failure wins -- and throws `new Response(message, { status: 400 })`
// with the exact message text. The UI lane surfaces these messages verbatim,
// so wording must not drift from the contract.
import { parse as parseToml } from "smol-toml"
import { strFromU8, unzipSync } from "fflate"

export type BundleManifest = {
  schemaVersion?: string
  id: string
  name: string
  version: string
  description: string
  trust?: string
  runtimeKind?: string
  runtimeModule?: string
}

export type InspectedBundle = {
  manifest: BundleManifest
  wasmPath: string
  capabilitiesPath: string
  entryNames: string[]
  schemaFiles: string[]
  promptFiles: string[]
  totalUncompressedBytes: number
}

// --- Untrusted-input caps (design.md D6, "Archives are validated as
// untrusted input") -----------------------------------------------------

const MAX_COMPRESSED_BYTES = 25 * 1024 * 1024
const MAX_ENTRY_COUNT = 2000
const MAX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
const MAX_ENTRY_UNCOMPRESSED_BYTES = 25 * 1024 * 1024

const MANIFEST_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

// Compression methods per APPNOTE 4.4.5: 0 = store, 8 = deflate. Everything
// else (e.g. 12 = bzip2, 14 = LZMA, 99 = AES) is a method fflate cannot
// decode, and must be rejected during inspect rather than left to fail
// later at upload with a message outside the D6 contract.
const SUPPORTED_COMPRESSION_METHODS = new Set([0, 8])
// General-purpose bit flag bits (APPNOTE 4.4.4).
const GPFLAG_ENCRYPTED = 0x0001
const GPFLAG_UTF8_NAME = 0x0800

function badRequest(message: string): Response {
  return new Response(message, { status: 400 })
}

// --- Minimal zip central-directory reader --------------------------------
//
// We parse only the central directory (file names, declared sizes,
// compression method, crc32, general-purpose flags, and Unix external
// attributes for symlink detection). This never touches a compressed data
// stream, so the size caps below are enforced from header metadata alone --
// a small, bounded read regardless of how large the archive claims to be
// uncompressed. That keeps rule 2 cheap, but declared sizes are still
// attacker-controlled: they are a safe *input to a cap check*, never a safe
// proxy for what the archive will actually produce once inflated (see the
// crc32/length check in readBundleFile below, which is what actually proves
// the extracted bytes match what the archive claims).

type ZipCentralEntry = {
  name: string
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  crc32: number
  generalPurposeFlag: number
  isDirectory: boolean
  isSymlink: boolean
}

const EOCD_SIGNATURE = 0x06054b50
const ZIP64_EOCD_LOCATOR_SIGNATURE = 0x07064b50
const ZIP64_EOCD_SIGNATURE = 0x06064b50
const CENTRAL_DIR_SIGNATURE = 0x02014b50
const ZIP64_EXTRA_FIELD_TAG = 1
const UNIX_HOST_OS = 3
const UNIX_SYMLINK_MODE = 0xa000
const UNIX_FILE_TYPE_MASK = 0xf000
const SENTINEL_32 = 0xffffffff
const MAX_EOCD_COMMENT_LENGTH = 65535
const EOCD_FIXED_SIZE = 22

function readUint16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8)
}

function readUint32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  )
}

// Full 64-bit little-endian read, matching fflate's own `b8` exactly (low
// dword + high dword * 2^32). This MUST NOT be truncated to the low dword:
// fflate preallocates its inflate output buffer from this full value, so an
// archive can declare a size like 2**32 + 100 and have us cap-check against
// 100 while fflate itself allocates gigabytes. Reading the real value here
// means the existing per-entry/total comparisons below reject it correctly
// with no separate "reject the high dword" special case needed.
function readUint64LE(buf: Uint8Array, offset: number): number {
  return readUint32LE(buf, offset) + readUint32LE(buf, offset + 4) * 4294967296
}

function findEndOfCentralDirectory(zip: Uint8Array): number {
  const minOffset = Math.max(0, zip.length - EOCD_FIXED_SIZE - MAX_EOCD_COMMENT_LENGTH)
  for (let offset = zip.length - EOCD_FIXED_SIZE; offset >= minOffset; offset--) {
    if (readUint32LE(zip, offset) === EOCD_SIGNATURE) return offset
  }
  throw badRequest("Upload must be a .zip archive")
}

/**
 * Parses the zip central directory without decompressing any entry. Reading
 * only the fixed-size header fields keeps this a bounded, cheap scan even for
 * an archive that claims a huge uncompressed size (rule 2 of D6 requires the
 * size caps to be enforced "before reading any entry content").
 */
function listZipEntries(zip: Uint8Array): ZipCentralEntry[] {
  if (zip.length < EOCD_FIXED_SIZE) {
    throw badRequest("Upload must be a .zip archive")
  }

  const eocdOffset = findEndOfCentralDirectory(zip)
  let entryCount = readUint16LE(zip, eocdOffset + 10)
  let centralDirOffset = readUint32LE(zip, eocdOffset + 16)

  // Zip64: the real entry count / central directory offset live in a
  // separate locator + record pair immediately before the standard EOCD.
  if (entryCount === 0xffff || centralDirOffset === SENTINEL_32) {
    const locatorOffset = eocdOffset - 20
    if (
      locatorOffset < 0 ||
      readUint32LE(zip, locatorOffset) !== ZIP64_EOCD_LOCATOR_SIGNATURE
    ) {
      throw badRequest("Upload must be a .zip archive")
    }
    // Low 32 bits only: the *locator's pointer* to the zip64 EOCD record is
    // a byte offset into this archive, which our own 25MB compressed-size
    // cap already bounds well under 2^32 -- unlike the per-entry sizes
    // below, which are the actual attacker-controlled quantity and must be
    // read in full.
    const zip64EocdOffset = readUint32LE(zip, locatorOffset + 8)
    if (readUint32LE(zip, zip64EocdOffset) !== ZIP64_EOCD_SIGNATURE) {
      throw badRequest("Upload must be a .zip archive")
    }
    entryCount = readUint32LE(zip, zip64EocdOffset + 32)
    centralDirOffset = readUint32LE(zip, zip64EocdOffset + 48)
  }

  const entries: ZipCentralEntry[] = []
  let offset = centralDirOffset

  for (let i = 0; i < entryCount; i++) {
    if (
      offset + 46 > zip.length ||
      readUint32LE(zip, offset) !== CENTRAL_DIR_SIGNATURE
    ) {
      throw badRequest("Upload must be a .zip archive")
    }

    const versionMadeBy = readUint16LE(zip, offset + 4)
    const generalPurposeFlag = readUint16LE(zip, offset + 8)
    const compressionMethod = readUint16LE(zip, offset + 10)
    const crc32Field = readUint32LE(zip, offset + 16)
    let compressedSize: number = readUint32LE(zip, offset + 20)
    let uncompressedSize: number = readUint32LE(zip, offset + 24)
    const nameLength = readUint16LE(zip, offset + 28)
    const extraLength = readUint16LE(zip, offset + 30)
    const commentLength = readUint16LE(zip, offset + 32)
    const externalAttrs = readUint32LE(zip, offset + 38)

    const nameStart = offset + 46
    const nameEnd = nameStart + nameLength
    if (nameEnd > zip.length) throw badRequest("Upload must be a .zip archive")
    // Decode the way fflate's own zip reader does: latin1 unless bit 11
    // (the UTF-8 "language encoding flag") is set. Decoding both readers
    // agree on a name for is what keeps validation (here) and extraction
    // (readBundleFile, via fflate) from disagreeing about which entry a
    // given name refers to.
    const isUtf8Name = (generalPurposeFlag & GPFLAG_UTF8_NAME) !== 0
    const name = strFromU8(zip.subarray(nameStart, nameEnd), !isUtf8Name)

    // Zip64 per-entry size override, when the fixed-width fields hold the
    // 0xffffffff sentinel. Values are read as full 64-bit numbers (see
    // readUint64LE) -- truncating here is exactly the bug this rewrite
    // fixes, since it is what let a small archive declare a small size while
    // fflate allocated gigabytes for the real one.
    if (compressedSize === SENTINEL_32 || uncompressedSize === SENTINEL_32) {
      const extraStart = nameEnd
      const extraEnd = extraStart + extraLength
      let p = extraStart
      while (p + 4 <= extraEnd && p + 4 <= zip.length) {
        const tag = readUint16LE(zip, p)
        const size = readUint16LE(zip, p + 2)
        if (tag === ZIP64_EXTRA_FIELD_TAG) {
          let fp = p + 4
          if (uncompressedSize === SENTINEL_32) {
            uncompressedSize = readUint64LE(zip, fp)
            fp += 8
          }
          if (compressedSize === SENTINEL_32) {
            compressedSize = readUint64LE(zip, fp)
            fp += 8
          }
        }
        p += 4 + size
      }
    }

    const hostOs = versionMadeBy >> 8
    // Symlink detection is best-effort by design: it only recognizes the
    // Unix external-attributes convention (host OS byte == 3, upper 16 bits
    // of external attrs == st_mode). A host OS byte other than 3, or a
    // Unix-built symlink whose external attrs were cleared, slips through
    // undetected. That is an accepted residual gap here -- nothing is ever
    // written to disk from these bytes and storage keys are fixed by kind,
    // so a missed symlink entry has no path-traversal consequence; it can
    // only end up rejected later as an unresolvable [runtime].module or an
    // invalid capabilities/manifest file. Real Unix zip tools (the only
    // realistic source of a genuine symlink entry) are correctly caught.
    const unixMode = hostOs === UNIX_HOST_OS ? externalAttrs >>> 16 : 0
    const isSymlink = (unixMode & UNIX_FILE_TYPE_MASK) === UNIX_SYMLINK_MODE

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      crc32: crc32Field,
      generalPurposeFlag,
      isDirectory: name.endsWith("/"),
      isSymlink,
    })

    offset = nameEnd + extraLength + commentLength
  }

  return entries
}

// --- crc32 -----------------------------------------------------------------
//
// The standard zip/zlib CRC-32 (polynomial 0xEDB88320). fflate does not
// export its internal implementation, so this is our own -- used solely to
// verify extracted bytes against the entry's declared crc32 (see
// readBundleFile), never as a security primitive on its own.

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function readZipEntryBytes(zip: Uint8Array, name: string): Uint8Array | undefined {
  const result = unzipSync(zip, { filter: (file) => file.name === name })
  return result[name]
}

/**
 * Reads and decompresses a single entry by exact path, and verifies the
 * result before returning it.
 *
 * fflate preallocates its inflate output buffer from the entry's *declared*
 * uncompressed size and silently drops any bytes that don't fit -- it never
 * raises an error for this. That means a corrupt or forged declared size
 * makes fflate return truncated data (declare 64 bytes over a stream that
 * really inflates to 20MB, get 64 bytes back) or, worse, completely empty
 * data (declare 0, get a zero-length -- but still truthy, object-typed --
 * Uint8Array back). Trusting that output as-is would let bundle upload store
 * a 0-byte "wasm" row that still satisfies REQUIRED_CONTENT_KINDS_BY_TYPE,
 * making a broken artifact publishable. So: verify what we actually got
 * against the entry's own declared length and crc32 (both read independently
 * from the central directory, not from whatever fflate happened to produce)
 * before trusting it as the file's content.
 */
export function readBundleFile(zip: Uint8Array, path: string): Uint8Array {
  const entries = listZipEntries(zip)
  // Last match wins, matching fflate's own `files[fn] = ...` behavior for
  // duplicate entry names -- so our integrity check compares against the
  // metadata for the exact entry fflate actually extracted, not an earlier
  // same-named one.
  const entry = entries.findLast((e) => !e.isDirectory && e.name === path)
  if (!entry) {
    throw badRequest(`Zip entry not found: ${path}`)
  }

  let bytes: Uint8Array | undefined
  try {
    bytes = readZipEntryBytes(zip, path)
  } catch {
    // A corrupt deflate stream can still pass the central-directory checks
    // above (those only read declared metadata); surface it the same way as
    // every other malformed-archive case instead of an uncaught exception.
    throw badRequest(`Zip entry could not be read: ${path}`)
  }
  if (bytes === undefined) {
    throw badRequest(`Zip entry not found: ${path}`)
  }

  if (bytes.length !== entry.uncompressedSize || crc32(bytes) !== entry.crc32) {
    throw badRequest(`Zip entry ${path} does not match its declared size or checksum`)
  }

  return bytes
}

// --- Layout helpers --------------------------------------------------------

function isIgnoredMetadataEntry(name: string): boolean {
  return (
    name === "__MACOSX" ||
    name.startsWith("__MACOSX/") ||
    name === ".DS_Store" ||
    name.endsWith("/.DS_Store")
  )
}

function isUnsafeEntryName(name: string): boolean {
  if (name.startsWith("/")) return true
  if (name.includes("\\")) return true
  if (name.includes("\0")) return true
  if (name.split("/").includes("..")) return true
  return false
}

function detectWrapperDirectory(names: string[]): string | null {
  if (names.length === 0) return null

  let wrapper: string | null = null
  for (const name of names) {
    const slash = name.indexOf("/")
    if (slash === -1) return null // an entry already sits at the root
    const topLevel = name.slice(0, slash)
    if (wrapper === null) wrapper = topLevel
    else if (wrapper !== topLevel) return null
  }
  return wrapper
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

/**
 * Validates an untrusted zip archive against every rule in design.md D6, in
 * the stated order (first failure wins), and returns the parsed manifest and
 * discovered file layout. Throws `Response` (400) on any rejection.
 */
export function inspectExtensionBundle(zip: Uint8Array): InspectedBundle {
  // 1. Magic bytes -- identify by content, never by filename or declared
  // content type (untrusted upload).
  if (
    zip.length < 4 ||
    zip[0] !== 0x50 ||
    zip[1] !== 0x4b ||
    zip[2] !== 0x03 ||
    zip[3] !== 0x04
  ) {
    throw badRequest("Upload must be a .zip archive")
  }

  // 2. Size caps, checked from header metadata only (see listZipEntries),
  // in D6's order: whole-archive compressed size, entry count, total
  // uncompressed, then per-entry uncompressed.
  if (zip.length > MAX_COMPRESSED_BYTES) {
    throw badRequest(`Zip archive is too large (max ${formatBytes(MAX_COMPRESSED_BYTES)} compressed)`)
  }

  const entries = listZipEntries(zip)

  if (entries.length > MAX_ENTRY_COUNT) {
    throw badRequest("Zip archive has too many entries")
  }

  let totalUncompressedBytes = 0
  for (const entry of entries) {
    totalUncompressedBytes += entry.uncompressedSize
  }
  if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    throw badRequest(
      `Zip archive is too large (max ${formatBytes(MAX_TOTAL_UNCOMPRESSED_BYTES)} uncompressed)`
    )
  }
  for (const entry of entries) {
    if (entry.uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) {
      throw badRequest(
        `Zip archive is too large (max ${formatBytes(MAX_ENTRY_UNCOMPRESSED_BYTES)} per entry)`
      )
    }
  }

  // 2b. Entry encoding must be readable and unencrypted -- checked here
  // (during inspect) so an archive can never pass inspection and then fail
  // on upload with a message outside this contract.
  for (const entry of entries) {
    if (!SUPPORTED_COMPRESSION_METHODS.has(entry.compressionMethod)) {
      throw badRequest(`Zip entry uses an unsupported compression method: ${entry.name}`)
    }
    if ((entry.generalPurposeFlag & GPFLAG_ENCRYPTED) !== 0) {
      throw badRequest(`Zip entries must not be encrypted: ${entry.name}`)
    }
  }

  // 3. Entry names -- path traversal, absolute paths, backslashes, NUL
  // bytes, and symlinks are all rejected with the same message.
  for (const entry of entries) {
    if (isUnsafeEntryName(entry.name) || entry.isSymlink) {
      throw badRequest(`Zip contains an unsafe entry path: ${entry.name}`)
    }
  }

  // Directory entries, __MACOSX/, and .DS_Store are noise from the zip tool,
  // not part of the extension -- strip them before layout/capabilities
  // analysis. (They already went through the size/safety checks above.)
  const visibleEntries = entries.filter(
    (entry) => !entry.isDirectory && !isIgnoredMetadataEntry(entry.name)
  )
  const visibleNames = visibleEntries.map((entry) => entry.name)

  // 4. No wrapper directory.
  const wrapperDir = detectWrapperDirectory(visibleNames)
  if (wrapperDir !== null) {
    throw badRequest(
      `Zip must contain the extension files at its root, not inside a wrapper folder (found "${wrapperDir}/"). Re-zip the folder's contents, not the folder itself.`
    )
  }

  // 5. manifest.toml at root.
  const manifestEntry = visibleEntries.find((entry) => entry.name === "manifest.toml")
  if (!manifestEntry) {
    throw badRequest("Zip is missing manifest.toml at its root")
  }

  // 6. manifest.toml parses as TOML.
  const manifestBytes = readBundleFile(zip, "manifest.toml")
  const manifestText = new TextDecoder("utf-8", { fatal: false }).decode(manifestBytes)
  let raw: Record<string, unknown>
  try {
    raw = parseToml(manifestText) as Record<string, unknown>
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw badRequest(`manifest.toml is not valid TOML: ${message}`)
  }

  // 7. Required fields, non-empty strings, checked in a fixed order.
  const requiredFields = ["id", "name", "version", "description"] as const
  for (const field of requiredFields) {
    const value = raw[field]
    if (typeof value !== "string" || value.trim() === "") {
      throw badRequest(`manifest.toml is missing required field: ${field}`)
    }
  }
  const id = raw.id as string
  const name = raw.name as string
  const version = raw.version as string
  const description = raw.description as string

  // 8. id shape.
  if (!MANIFEST_ID_PATTERN.test(id)) {
    throw badRequest("manifest.toml id must be lowercase alphanumeric with . _ -")
  }

  // 9. Runtime module must be present and resolve to a *visible* entry --
  // noise entries such as __MACOSX/._x are not eligible targets, so a
  // manifest claiming one of those as its module is treated the same as a
  // manifest pointing nowhere.
  const runtimeTable =
    typeof raw.runtime === "object" && raw.runtime !== null
      ? (raw.runtime as Record<string, unknown>)
      : undefined
  const runtimeModuleValue = runtimeTable?.module
  if (typeof runtimeModuleValue !== "string" || runtimeModuleValue === "") {
    throw badRequest("manifest.toml is missing required field: [runtime].module")
  }
  const runtimeModule = runtimeModuleValue
  const visibleFileNames = new Set(visibleNames)
  if (!visibleFileNames.has(runtimeModule)) {
    throw badRequest(
      `manifest.toml [runtime].module points to "${runtimeModule}", which is not in the zip`
    )
  }

  // 10. Exactly one *.capabilities.json at the root, valid JSON.
  const capabilitiesCandidates = visibleEntries.filter(
    (entry) => !entry.name.includes("/") && entry.name.endsWith(".capabilities.json")
  )
  if (capabilitiesCandidates.length !== 1) {
    throw badRequest(
      `Zip must contain exactly one *.capabilities.json at its root (found ${capabilitiesCandidates.length})`
    )
  }
  const capabilitiesEntry = capabilitiesCandidates[0]
  const capabilitiesBytes = readBundleFile(zip, capabilitiesEntry.name)
  const capabilitiesText = new TextDecoder("utf-8", { fatal: false }).decode(capabilitiesBytes)
  try {
    JSON.parse(capabilitiesText)
  } catch {
    throw badRequest(`${capabilitiesEntry.name} is not valid JSON`)
  }

  const runtimeKindValue = runtimeTable?.kind
  const trustValue = raw.trust
  const schemaVersionValue = raw.schema_version

  return {
    manifest: {
      schemaVersion: typeof schemaVersionValue === "string" ? schemaVersionValue : undefined,
      id,
      name,
      version,
      description,
      trust: typeof trustValue === "string" ? trustValue : undefined,
      runtimeKind: typeof runtimeKindValue === "string" ? runtimeKindValue : undefined,
      runtimeModule,
    },
    wasmPath: runtimeModule,
    capabilitiesPath: capabilitiesEntry.name,
    entryNames: entries.filter((entry) => !entry.isDirectory).map((entry) => entry.name),
    schemaFiles: visibleEntries
      .filter((entry) => entry.name.startsWith("schemas/"))
      .map((entry) => entry.name),
    promptFiles: visibleEntries
      .filter((entry) => entry.name.startsWith("prompts/"))
      .map((entry) => entry.name),
    totalUncompressedBytes,
  }
}
