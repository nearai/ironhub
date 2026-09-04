// Test-only support for building adversarial zip archives byte-by-byte.
//
// fflate's `zipSync` cannot produce a forged archive (mismatched declared
// sizes, missing zip64 locators, lying crc32) because it always computes
// those fields correctly from the real data it's given. Testing bundle.ts's
// defenses against exactly those lies requires constructing the archive by
// hand instead, matching the raw APPNOTE.TXT layout bundle.ts itself parses.
import { deflateSync } from "fflate"

export const encode = (text) => new TextEncoder().encode(text)

function writeU16LE(buf, offset, value) {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >> 8) & 0xff
}
function writeU32LE(buf, offset, value) {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >>> 8) & 0xff
  buf[offset + 2] = (value >>> 16) & 0xff
  buf[offset + 3] = (value >>> 24) & 0xff
}
// Writes a JS number as an 8-byte little-endian field (low dword + high
// dword). Safe for test-sized values (all well under 2^53).
function writeU64LE(buf, offset, value) {
  const low = value % 4294967296
  const high = Math.floor(value / 4294967296)
  writeU32LE(buf, offset, low)
  writeU32LE(buf, offset + 4, high)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts) {
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

/**
 * Builds a raw zip archive by hand, allowing each entry's *declared* sizes,
 * crc32, and zip64 usage to diverge from its real content -- exactly what an
 * attacker controls, and exactly what bundle.ts's zip64 locator gate and
 * bounded-extraction verification respond to.
 *
 * @param {{
 *   entries: Array<{
 *     name: string
 *     content: Uint8Array               // the REAL uncompressed content
 *     method?: 0 | 8                    // default 8 (deflate); 0 = store
 *     declaredUncompressedSize?: number // overrides content.length in the record
 *     declaredCompressedSize?: number   // overrides the real stored-bytes length
 *     declaredCrc32?: number            // overrides crc32(content)
 *     forceZip64Extra?: boolean         // emit a zip64 extra field even if the
 *                                       // (possibly-overridden) sizes fit in 32 bits
 *   }>
 *   includeZip64Locator: boolean        // whether to emit the zip64 EOCD locator + record
 * }} options
 * @returns {Uint8Array}
 */
export function buildRawZipArchive({ entries, includeZip64Locator }) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const spec of entries) {
    const name = encode(spec.name)
    const method = spec.method ?? 8
    const storedBytes = method === 0 ? spec.content : deflateSync(spec.content, { level: 6 })
    const crc = spec.declaredCrc32 ?? crc32(spec.content)
    const declaredUncompressed = spec.declaredUncompressedSize ?? spec.content.length
    const declaredCompressed = spec.declaredCompressedSize ?? storedBytes.length

    const needsZip64 =
      Boolean(spec.forceZip64Extra) ||
      declaredUncompressed > 0xfffffffe ||
      declaredCompressed > 0xfffffffe

    let zip64Extra = new Uint8Array(0)
    if (needsZip64) {
      zip64Extra = new Uint8Array(20)
      writeU16LE(zip64Extra, 0, 1) // tag: zip64 extended information
      writeU16LE(zip64Extra, 2, 16) // size: two 8-byte fields
      writeU64LE(zip64Extra, 4, declaredUncompressed)
      writeU64LE(zip64Extra, 12, declaredCompressed)
    }

    const localHeaderOffset = offset
    const localHeader = new Uint8Array(30)
    writeU32LE(localHeader, 0, 0x04034b50)
    writeU16LE(localHeader, 4, needsZip64 ? 45 : 20)
    writeU16LE(localHeader, 6, 0)
    writeU16LE(localHeader, 8, method)
    writeU32LE(localHeader, 10, 0)
    writeU32LE(localHeader, 14, crc)
    writeU32LE(localHeader, 18, needsZip64 ? 0xffffffff : declaredCompressed)
    writeU32LE(localHeader, 22, needsZip64 ? 0xffffffff : declaredUncompressed)
    writeU16LE(localHeader, 26, name.length)
    writeU16LE(localHeader, 28, zip64Extra.length)

    localParts.push(localHeader, name, zip64Extra, storedBytes)
    offset += localHeader.length + name.length + zip64Extra.length + storedBytes.length

    const centralHeader = new Uint8Array(46)
    writeU32LE(centralHeader, 0, 0x02014b50)
    writeU16LE(centralHeader, 4, needsZip64 ? 0x0314 : 0x0014)
    writeU16LE(centralHeader, 6, needsZip64 ? 45 : 20)
    writeU16LE(centralHeader, 8, 0)
    writeU16LE(centralHeader, 10, method)
    writeU32LE(centralHeader, 16, crc)
    writeU32LE(centralHeader, 20, needsZip64 ? 0xffffffff : declaredCompressed)
    writeU32LE(centralHeader, 24, needsZip64 ? 0xffffffff : declaredUncompressed)
    writeU16LE(centralHeader, 28, name.length)
    writeU16LE(centralHeader, 30, zip64Extra.length)
    writeU16LE(centralHeader, 32, 0)
    writeU16LE(centralHeader, 34, 0)
    writeU16LE(centralHeader, 36, 0)
    writeU32LE(centralHeader, 38, 0)
    writeU32LE(centralHeader, 42, localHeaderOffset)

    centralParts.push(centralHeader, name, zip64Extra)
  }

  const centralDirOffset = offset
  let centralDirSize = 0
  for (const part of centralParts) centralDirSize += part.length

  const tailParts = []
  if (includeZip64Locator) {
    const zip64EocdOffset = centralDirOffset + centralDirSize
    const zip64Eocd = new Uint8Array(56)
    writeU32LE(zip64Eocd, 0, 0x06064b50)
    writeU64LE(zip64Eocd, 4, 44)
    writeU16LE(zip64Eocd, 12, 45)
    writeU16LE(zip64Eocd, 14, 45)
    writeU32LE(zip64Eocd, 16, 0)
    writeU32LE(zip64Eocd, 20, 0)
    writeU64LE(zip64Eocd, 24, entries.length)
    writeU64LE(zip64Eocd, 32, entries.length)
    writeU64LE(zip64Eocd, 40, centralDirSize)
    writeU64LE(zip64Eocd, 48, centralDirOffset)

    const locator = new Uint8Array(20)
    writeU32LE(locator, 0, 0x07064b50)
    writeU32LE(locator, 4, 0)
    writeU64LE(locator, 8, zip64EocdOffset)
    writeU32LE(locator, 16, 1)

    tailParts.push(zip64Eocd, locator)
  }

  const eocd = new Uint8Array(22)
  writeU32LE(eocd, 0, 0x06054b50)
  writeU16LE(eocd, 4, 0)
  writeU16LE(eocd, 6, 0)
  writeU16LE(eocd, 8, entries.length)
  writeU16LE(eocd, 10, entries.length)
  writeU32LE(eocd, 12, centralDirSize)
  writeU32LE(eocd, 16, centralDirOffset)
  writeU16LE(eocd, 20, 0)

  return concat([...localParts, ...centralParts, ...tailParts, eocd])
}
