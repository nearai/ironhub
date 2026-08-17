// Extension bundle ingest (design.md D6). This module is pure and
// unit-testable: no HTTP, no Prisma, no storage. It only knows how to read
// and validate an untrusted zip archive uploaded by an org member.
//
// Every validation rule below runs in the exact order specified by D6 --
// first failure wins -- and throws `new Response(message, { status: 400 })`
// with the exact message text. The UI lane surfaces these messages verbatim,
// so wording must not drift from the contract.
//
// The root threat this file defends against (per two rounds of adversarial
// review): attacker-controlled zip metadata used as a resource bound,
// interpreted by two readers (this validator and fflate, which actually
// extracts) under different rules. Declared sizes are NEVER trusted for
// allocation anywhere in this file -- only for cheap, disposable comparisons
// (rule 2's pre-filter) and for picking the smaller of two numbers (the
// bounded-extraction budget below). The only thing that determines how much
// memory extraction actually uses is real, observed output byte counts,
// counted incrementally and aborted on overflow -- see extractVerifiedEntry.
import { parse as parseToml } from "smol-toml"
import { Inflate, strFromU8 } from "fflate"

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

// Rule 3c: the D3 per-kind caps (content.ts's MAX_CONTENT_BYTES_BY_KIND),
// applied during inspect for the three kinds inspect resolves, so an archive
// that would fail at PUT .../bundle fails identically at POST
// .../bundle/inspect instead of inspecting clean and failing later.
//
// Duplicated here rather than imported from content.ts: bundle.ts must stay
// free of Prisma/HTTP dependencies (content.ts transitively imports ../db,
// which constructs a real Prisma client at module load), and
// inspectExtensionBundle's signature is fixed by design.md D6 to take only
// `zip: Uint8Array`, with no injectable config parameter. Both tables are
// independently derived from the same design.md D3 spec values;
// bundle.test.mjs asserts this table equals content.ts's real export so a
// future change to one can't silently drift from the other.
const MAX_KIND_BYTES_DURING_INSPECT = {
  wasm: 5 * 1024 * 1024,
  capabilities: 5 * 1024 * 1024,
  manifest_toml: 256 * 1024,
} as const

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

function describeKindLimit(maxBytes: number): string {
  return maxBytes >= 1024 * 1024
    ? `${maxBytes / (1024 * 1024)}MB`
    : `${maxBytes / 1024}KB`
}

// --- Minimal zip central-directory reader --------------------------------
//
// We parse only the central directory (file names, declared sizes,
// compression method, crc32, general-purpose flags, local-header offsets,
// and Unix external attributes for symlink detection). This never touches a
// compressed data stream, so the size caps in rule 2 are enforced from
// header metadata alone -- a small, bounded read regardless of how large the
// archive claims to be uncompressed. That keeps rule 2 cheap, but it is a
// pre-filter only: declared sizes are attacker-controlled and are never used
// to size an allocation anywhere in this file (see extractVerifiedEntry).

type ZipCentralEntry = {
  name: string
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  crc32: number
  generalPurposeFlag: number
  localHeaderOffset: number
  isDirectory: boolean
  isSymlink: boolean
}

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
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
// dword + high dword * 2^32).
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
 * Whether a zip64 End Of Central Directory locator + record are present,
 * mirroring fflate's own `z` flag exactly (fflate/esm/index.mjs, `unzipSync`):
 * both the locator signature at `eocdOffset - 20` AND the record signature
 * at the offset it points to must match.
 *
 * This gate matters on its own, separately from reading zip64 values
 * correctly: a per-entry zip64 extra field is only ever consulted by fflate
 * when this flag is true. Reading it unconditionally -- matching *values*
 * correctly but not *applicability* -- lets an archive show this validator
 * a small size via a zip64 extra field while fflate, finding no locator,
 * never looks at that field at all and keeps the raw 0xFFFFFFFF sentinel
 * (which IS what it then allocates from). Two adversarial reviews found two
 * different-looking instances of this exact class of bug; this flag is the
 * single gate that closes it structurally rather than patch-by-patch.
 */
function detectZip64Eocd(zip: Uint8Array, eocdOffset: number): number | null {
  const locatorOffset = eocdOffset - 20
  if (locatorOffset < 0 || locatorOffset + 20 > zip.length) return null
  if (readUint32LE(zip, locatorOffset) !== ZIP64_EOCD_LOCATOR_SIGNATURE) return null
  const zip64EocdOffset = readUint32LE(zip, locatorOffset + 8)
  if (zip64EocdOffset + 56 > zip.length) return null
  if (readUint32LE(zip, zip64EocdOffset) !== ZIP64_EOCD_SIGNATURE) return null
  return zip64EocdOffset
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
  const zip64EocdOffset = detectZip64Eocd(zip, eocdOffset)
  const hasZip64Locator = zip64EocdOffset !== null

  let entryCount = readUint16LE(zip, eocdOffset + 10)
  let centralDirOffset = readUint32LE(zip, eocdOffset + 16)

  if (hasZip64Locator) {
    entryCount = readUint32LE(zip, zip64EocdOffset + 32)
    centralDirOffset = readUint32LE(zip, zip64EocdOffset + 48)
  } else if (entryCount === 0xffff || centralDirOffset === SENTINEL_32) {
    // A plain EOCD cannot itself represent >65535 entries or a >4GB central
    // directory offset; sentinel values here without a zip64 locator can
    // only mean a malformed or adversarial archive.
    throw badRequest("Upload must be a .zip archive")
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
    let localHeaderOffset: number = readUint32LE(zip, offset + 42)

    const nameStart = offset + 46
    const nameEnd = nameStart + nameLength
    if (nameEnd > zip.length) throw badRequest("Upload must be a .zip archive")
    // Decode the way fflate's own zip reader does: latin1 unless bit 11
    // (the UTF-8 "language encoding flag") is set, so validation and
    // extraction never disagree about which entry a given name refers to.
    const isUtf8Name = (generalPurposeFlag & GPFLAG_UTF8_NAME) !== 0
    const name = strFromU8(zip.subarray(nameStart, nameEnd), !isUtf8Name)

    // Zip64 per-entry overrides: only consulted when a zip64 EOCD locator
    // is present (see detectZip64Eocd's docblock) -- otherwise the fields
    // that hold the 0xFFFFFFFF sentinel are left exactly as read, which is
    // also what fflate effectively uses in that case, and which the rule-2
    // cap checks below correctly reject as too large.
    if (
      hasZip64Locator &&
      (compressedSize === SENTINEL_32 ||
        uncompressedSize === SENTINEL_32 ||
        localHeaderOffset === SENTINEL_32)
    ) {
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
          if (localHeaderOffset === SENTINEL_32) {
            localHeaderOffset = readUint64LE(zip, fp)
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
      localHeaderOffset,
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
// extractVerifiedEntry), never as a security primitive on its own.

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

/** Locates the start of an entry's compressed data by reading its *local*
 * file header (which can have a different extra-field length than the
 * central directory record for the same entry). */
function findLocalDataOffset(zip: Uint8Array, localHeaderOffset: number): number {
  if (
    localHeaderOffset < 0 ||
    localHeaderOffset + 30 > zip.length ||
    readUint32LE(zip, localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE
  ) {
    throw badRequest("Upload must be a .zip archive")
  }
  const nameLength = readUint16LE(zip, localHeaderOffset + 26)
  const extraLength = readUint16LE(zip, localHeaderOffset + 28)
  const dataStart = localHeaderOffset + 30 + nameLength + extraLength
  if (dataStart > zip.length) {
    throw badRequest("Upload must be a .zip archive")
  }
  return dataStart
}

const INFLATE_INPUT_CHUNK_SIZE = 16 * 1024

// fflate's `Inflate.push` appends each pushed chunk to an internal pending
// buffer with a full copy (`Inflate.prototype.e`), and only drops bytes it
// has actually consumed. Once the real DEFLATE stream's final block has been
// fully decoded, nothing more is ever consumed -- so continuing to push
// chunks after that point grows that pending buffer by one chunk on every
// call while copying the *entire* accumulated buffer each time: O(chunks^2)
// in however much input we keep feeding. Bounding total input (see
// extractVerifiedEntry) fixes this for a legitimate entry whose declared
// compressed size is honest and small; it does not fix it for an entry
// whose declared compressed size is large (honestly or as a lie clamped by
// the archive's own cap), where we would otherwise keep feeding chunks all
// the way to that bound even though the real stream finished long ago. This
// reads fflate's own internal completion state after every push to stop as
// soon as that happens, regardless of how much of the input bound remains.
// `f` (BFINAL, the last-block bit) and `l` (pending literal/length tree
// state) together are exactly the condition `inflt` itself checks to
// short-circuit (`st.f && !st.l`); once both hold, further pushes are
// provably no-ops. This couples to a private, unexported part of fflate's
// implementation -- if a future fflate version changes this shape, the
// worst case is falling back to the bound alone (still correct, just not
// early-exiting), never a correctness regression.
type InflateInternalState = { f?: number; l?: unknown }
function isInflateComplete(inflator: Inflate): boolean {
  const state = (inflator as unknown as { s?: InflateInternalState }).s
  return Boolean(state?.f) && !state?.l
}

/**
 * Inflates `compressed` through fflate's streaming `Inflate` decoder, fed in
 * small input chunks, checking the running *output* total after every chunk
 * and aborting immediately once it would exceed `boundBytes`.
 *
 * This exists because `inflateSync`/`unzipSync` preallocate their output
 * buffer from a size the caller passes in -- and the only size available
 * here is the entry's declared uncompressed size, which is exactly what an
 * attacker controls. Calling either of those with any size derived from the
 * archive would make the allocation itself the attack, regardless of how
 * carefully that size was validated first. Streaming input in small pieces
 * and checking real, observed output after each piece is what makes the
 * bound actually bound something -- worst case, a single pathological input
 * chunk can only expand to roughly what DEFLATE's fixed 32KB window and
 * 258-byte max match length allow (in the tens of MB, not GB), and this
 * function stops feeding further chunks as soon as one check fails.
 *
 * `compressed` is expected to already be bounded to (approximately) the
 * entry's real compressed length by the caller -- see extractVerifiedEntry
 * and the O(n^2) note on isInflateComplete above for why this function must
 * not be handed an unbounded remainder "just in case" the real stream ends
 * early.
 */
// Test-only instrumentation: lets bundle.test.mjs verify the O(n^2) input-
// feeding fix (total bytes fed to the deflate decoder must be bounded by
// the entry's declared compressed size, not the whole archive remainder)
// as a deterministic byte-count invariant rather than a wall-clock timing
// guard. A no-op unless a test explicitly installs a listener; never called
// with a listener installed outside tests.
let onInflateInputChunk: ((byteLength: number) => void) | null = null
export function __setInflateInputChunkListenerForTests(
  listener: ((byteLength: number) => void) | null
): void {
  onInflateInputChunk = listener
}

// Test-only instrumentation: lets bundle.test.mjs verify the extraction
// budget is actually min(declaredSize, maxBytes) and not declaredSize alone
// -- reports the running accumulated-output total, so a test can assert its
// peak never exceeds a given kind's cap even when the entry honestly
// declares (and truly contains) more than that.
let onInflateOutputTotal: ((total: number) => void) | null = null
export function __setInflateOutputTotalListenerForTests(
  listener: ((total: number) => void) | null
): void {
  onInflateOutputTotal = listener
}

function inflateBounded(
  compressed: Uint8Array,
  boundBytes: number
): { bytes: Uint8Array; overflowed: boolean } {
  const chunks: Uint8Array[] = []
  let total = 0
  let overflowed = false

  const inflator = new Inflate((chunk) => {
    if (overflowed || chunk.length === 0) return
    total += chunk.length
    onInflateOutputTotal?.(total)
    if (total > boundBytes) {
      overflowed = true
      return
    }
    chunks.push(chunk)
  })

  for (let i = 0; i < compressed.length; i += INFLATE_INPUT_CHUNK_SIZE) {
    if (overflowed) break
    const end = Math.min(i + INFLATE_INPUT_CHUNK_SIZE, compressed.length)
    const isFinal = end >= compressed.length
    onInflateInputChunk?.(end - i)
    try {
      inflator.push(compressed.subarray(i, end), isFinal)
    } catch {
      // A malformed DEFLATE stream -- report the same way as any other
      // mismatch, rather than as an uncaught exception.
      overflowed = true
      break
    }
    if (overflowed) break
    // The real stream is fully decoded -- stop feeding further input chunks
    // even though more of our (already-bounded) input remains.
    if (isInflateComplete(inflator)) break
  }

  if (overflowed) {
    return { bytes: new Uint8Array(0), overflowed: true }
  }

  let totalLength = 0
  for (const chunk of chunks) totalLength += chunk.length
  const out = new Uint8Array(totalLength)
  let pos = 0
  for (const chunk of chunks) {
    out.set(chunk, pos)
    pos += chunk.length
  }
  return { bytes: out, overflowed: false }
}

/**
 * Extracts and verifies a single entry by exact path. `maxBytes` bounds how
 * much output extraction will ever hold in memory, independent of anything
 * the archive declares. Verifies, after extraction:
 *  - non-zero length,
 *  - length within `maxBytes`,
 *  - length exactly equals the entry's own declared uncompressed size, and
 *  - crc32 exactly matches the entry's own declared crc32.
 *
 * The length/crc32 check alone is not sufficient: both values come from the
 * archive's own (attacker-controlled) central directory, so a truncated
 * stream declaring a short length and the crc32 of only that truncated
 * prefix passes it trivially. What actually catches that is the *bound*:
 * extraction targets `min(declaredSize, maxBytes) + 1` bytes of real output,
 * so a stream that truly ends at the declared length never reaches the +1,
 * while one that continues past it (the truncation attack) does -- and that
 * overflow is treated as a mismatch, not silently truncated and accepted.
 */
function extractVerifiedEntry(
  zip: Uint8Array,
  path: string,
  maxBytes: number,
  describeMismatch: (entry: ZipCentralEntry) => string
): Uint8Array {
  const entries = listZipEntries(zip)
  // Last match wins, matching fflate's own `files[fn] = ...` behavior for
  // duplicate entry names, so this reads the same entry fflate would.
  const entry = entries.findLast((e) => !e.isDirectory && e.name === path)
  if (!entry) {
    throw badRequest(`Zip entry not found: ${path}`)
  }

  const dataStart = findLocalDataOffset(zip, entry.localHeaderOffset)
  let bytes: Uint8Array

  if (entry.compressionMethod === 0) {
    // Store: output is a verbatim slice, so there is no expansion-ratio
    // attack surface, and real data can never exceed the whole archive's
    // own 25MB compressed-size cap (rule 2). `subarray` is a view, not a
    // copy, and clamps to the buffer's real end, so this is memory-safe
    // even if `compressedSize` lies.
    const sliceEnd = Math.min(dataStart + entry.compressedSize, zip.length)
    bytes = zip.subarray(dataStart, Math.max(sliceEnd, dataStart))
  } else {
    // Deflate: bound the *output* ourselves; never trust the declared size
    // for allocation (see inflateBounded's docblock).
    const budget = Math.min(entry.uncompressedSize, maxBytes)
    const boundBytes = budget + 1
    // Bound *input* to the entry's declared compressed size too (clamped to
    // what's actually left in the buffer) rather than feeding the entire
    // remainder of the archive. This is safe as an input upper bound only:
    // input is already capped by the archive's own 25MB compressed-size cap
    // (rule 2) regardless, and under-feeding a lying/short compressedSize
    // just produces incomplete output that fails the length/crc check below
    // -- it fails closed, same as every other mismatch here. It is NOT safe
    // to skip this and rely on inflateBounded's own early-stop alone: that
    // stops once the real stream completes, but every chunk fed before that
    // point still costs a full pending-buffer copy (see the O(n^2) note on
    // isInflateComplete), so feeding "the rest of the archive" by default
    // turns one legitimate large bundle into tens of seconds of CPU.
    const inputEnd = Math.min(dataStart + entry.compressedSize, zip.length)
    const input = zip.subarray(dataStart, Math.max(inputEnd, dataStart))
    const result = inflateBounded(input, boundBytes)
    if (result.overflowed) {
      throw badRequest(describeMismatch(entry))
    }
    bytes = result.bytes
  }

  if (bytes.length === 0 || bytes.length > maxBytes) {
    throw badRequest(describeMismatch(entry))
  }
  if (bytes.length !== entry.uncompressedSize || crc32(bytes) !== entry.crc32) {
    throw badRequest(describeMismatch(entry))
  }

  return bytes
}

/** Reads and verifies a single entry by exact path. */
export function readBundleFile(zip: Uint8Array, path: string): Uint8Array {
  return extractVerifiedEntry(
    zip,
    path,
    MAX_ENTRY_UNCOMPRESSED_BYTES,
    () => `Zip entry ${path} does not match its declared size or checksum`
  )
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

/** Builds the mismatch message for a rule-3c (D3 per-kind cap) check: names
 * the specific over-limit reason when the archive's own declared size
 * already exceeds the kind's cap, or falls back to the generic
 * declared-size/checksum mismatch message otherwise (covers truncation,
 * corruption, and the streaming-bound overflow case alike). */
function describeKindMismatch(
  path: string,
  kind: keyof typeof MAX_KIND_BYTES_DURING_INSPECT
) {
  const maxBytes = MAX_KIND_BYTES_DURING_INSPECT[kind]
  return (entry: ZipCentralEntry): string =>
    entry.uncompressedSize > maxBytes
      ? `Content exceeds the ${describeKindLimit(maxBytes)} limit for ${kind}`
      : `Zip entry ${path} does not match its declared size or checksum`
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
  // uncompressed, then per-entry uncompressed. This is a cheap pre-filter,
  // not the actual memory-safety guarantee -- see extractVerifiedEntry for
  // that.
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

  // 3. Entry names -- path traversal, absolute paths, backslashes, NUL
  // bytes, and symlinks are all rejected with the same message.
  for (const entry of entries) {
    if (isUnsafeEntryName(entry.name) || entry.isSymlink) {
      throw badRequest(`Zip contains an unsafe entry path: ${entry.name}`)
    }
  }

  // 3b. Entry encoding must be readable and unencrypted -- checked here
  // (during inspect) so an archive can never pass inspection and then fail
  // on upload with a message outside this contract. Ordered *after* rule 3
  // so an archive that is both unsafely named and exotically compressed
  // reports the unsafe path, not the compression method.
  for (const entry of entries) {
    if (!SUPPORTED_COMPRESSION_METHODS.has(entry.compressionMethod)) {
      throw badRequest(`Zip entry uses an unsupported compression method: ${entry.name}`)
    }
    if ((entry.generalPurposeFlag & GPFLAG_ENCRYPTED) !== 0) {
      throw badRequest(`Zip entries must not be encrypted: ${entry.name}`)
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

  // 6. manifest.toml parses as TOML. Rule 3c: apply its D3 cap here too.
  const manifestBytes = extractVerifiedEntry(
    zip,
    "manifest.toml",
    MAX_KIND_BYTES_DURING_INSPECT.manifest_toml,
    describeKindMismatch("manifest.toml", "manifest_toml")
  )
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
  // manifest pointing nowhere. Rule 3c: apply the wasm D3 cap here too.
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
  extractVerifiedEntry(
    zip,
    runtimeModule,
    MAX_KIND_BYTES_DURING_INSPECT.wasm,
    describeKindMismatch(runtimeModule, "wasm")
  )

  // 10. Exactly one *.capabilities.json at the root, valid JSON. Rule 3c:
  // apply its D3 cap here too.
  const capabilitiesCandidates = visibleEntries.filter(
    (entry) => !entry.name.includes("/") && entry.name.endsWith(".capabilities.json")
  )
  if (capabilitiesCandidates.length !== 1) {
    throw badRequest(
      `Zip must contain exactly one *.capabilities.json at its root (found ${capabilitiesCandidates.length})`
    )
  }
  const capabilitiesEntry = capabilitiesCandidates[0]
  const capabilitiesBytes = extractVerifiedEntry(
    zip,
    capabilitiesEntry.name,
    MAX_KIND_BYTES_DURING_INSPECT.capabilities,
    describeKindMismatch(capabilitiesEntry.name, "capabilities")
  )
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
