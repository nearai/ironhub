// Publish-time verification: does the entry this artifact would publish
// satisfy the agent's contract?
//
// Every rule below is one the agent enforces after the manifest is signed and
// fetched, at which point the failure surfaces as an agent-side error naming
// the agent's own constants, in a log the artifact's owner cannot see. The
// point of running them here is not defence in depth -- upload-time ingest
// already rejects most of this -- it is *attribution*: an artifact that cannot
// install should say so on its own screen, before an install is offered.
//
// Ingest is not the only writer, which is why this cannot simply trust what
// ingest accepted. `PUT .../content/manifest_toml` replaces the declaration
// document on its own, with no archive and no asset pass; `DELETE
// .../content/wasm` removes a required kind; and a bundle uploaded before this
// change stored no assets at all. Each leaves a stored artifact whose parts are
// individually valid and collectively unpublishable.
//
// The checks split in two on purpose:
//
//   * `verifyPublishedEntry` is pure and takes the finished entry. Everything
//     it needs -- every byte count, every published path -- is already in the
//     entry, so it cannot check a different asset set than the one that would
//     be published. That is the same rule `toolEntryArtifactDigest` follows,
//     and for the same reason (design.md D4).
//   * `verifyPrivateArtifact` builds the entry first, which is itself the
//     C9 set-equality check: the builder iterates the paths manifest.toml
//     declares and fails on any that is not stored, and never reaches a stored
//     asset nothing declares.
import { MANIFEST_SIGNING_KEY_ID } from "@/lib/catalog/manifest-signing.server"
import {
  CatalogOriginError,
  requireCatalogOriginBaseUrl,
} from "@/lib/catalog/catalog-origin"
import {
  MAX_MANIFEST_BYTES,
  MAX_METADATA_BYTES,
  MAX_SIGNED_MANIFEST_BYTES,
  MAX_TOOL_PROMPT_ARTIFACTS,
  MAX_TOOL_SCHEMA_ARTIFACTS,
  MAX_WASM_BYTES,
} from "@/lib/catalog/ironclaw-contract"
import type { HubArtifact } from "@/lib/catalog/manifest-types"

import {
  buildPrivateArtifactEntry,
  privateArtifactManifestDocument,
  type PrivateArtifactEntry,
} from "./manifest"

export type ArtifactVerificationFailure = {
  /** Stable id, so a UI can key or filter without matching on prose. */
  id: string
  message: string
}

export type ArtifactVerification = {
  ok: boolean
  failures: ArtifactVerificationFailure[]
}

/** Ed25519 signatures are 64 bytes, which is 86 base64url characters. */
const SIGNATURE_BASE64URL_LENGTH = 86

/**
 * Every rule the agent applies to a finished entry, over the finished entry.
 *
 * Returns all failures rather than the first, because an artifact with three
 * problems should be fixed in one pass rather than three round trips through
 * a re-upload.
 */
export function verifyPublishedEntry(
  entry: PrivateArtifactEntry
): ArtifactVerificationFailure[] {
  const failures: ArtifactVerificationFailure[] = []

  const checkSize = (
    id: string,
    label: string,
    artifact: HubArtifact | undefined,
    limit: number
  ) => {
    if (artifact && artifact.size_bytes > limit) {
      failures.push({
        id,
        message: `${label} is ${artifact.size_bytes} bytes; the agent rejects anything above ${limit}`,
      })
    }
  }

  if (entry.type === "skill") {
    checkSize(
      "skill_md_size",
      "SKILL.md",
      entry.skill.skill_md,
      MAX_METADATA_BYTES
    )
  } else {
    const tool = entry.tool
    checkSize("wasm_size", "The wasm module", tool.wasm, MAX_WASM_BYTES)
    checkSize(
      "capabilities_size",
      "The capabilities document",
      tool.capabilities,
      MAX_METADATA_BYTES
    )
    checkSize(
      "manifest_toml_size",
      "manifest.toml",
      tool.manifest,
      MAX_METADATA_BYTES
    )

    // Counts, not truncation. Publishing the first 32 of 40 declared schemas
    // would satisfy this bound and then fail C9's set equality instead --
    // that is design.md's D5, and it is why the private path rejects rather
    // than trims.
    checkCount(
      failures,
      "schema_count",
      "schema",
      tool.schemas,
      MAX_TOOL_SCHEMA_ARTIFACTS
    )
    checkCount(
      failures,
      "prompt_count",
      "prompt",
      tool.prompts,
      MAX_TOOL_PROMPT_ARTIFACTS
    )

    for (const [kind, assets] of [
      ["schema", tool.schemas],
      ["prompt", tool.prompts],
    ] as const) {
      for (const [path, artifact] of Object.entries(assets ?? {})) {
        checkSize(
          "asset_size",
          `The ${kind} asset "${path}"`,
          artifact,
          MAX_METADATA_BYTES
        )
      }
    }
  }

  failures.push(...verifyDocumentSize(entry))

  return failures
}

function checkCount(
  failures: ArtifactVerificationFailure[],
  id: string,
  kind: string,
  assets: Record<string, HubArtifact> | undefined,
  limit: number
) {
  const count = Object.keys(assets ?? {}).length
  if (count > limit) {
    failures.push({
      id,
      message: `This tool publishes ${count} ${kind} assets; the agent accepts at most ${limit}`,
    })
  }
}

/**
 * C11's two document ceilings, measured rather than assumed.
 *
 * They used to be unreachable: an entry was four artifacts of fixed shape.
 * Publishing schemas and prompts adds roughly 150 bytes of JSON per asset, so
 * at the 32/64 ceilings the document is still comfortably inside 1MB -- but
 * "comfortably" is a calculation about today's URL lengths, and the token in
 * every URL is the longest part of it. Measuring the built document costs one
 * `JSON.stringify` and removes the calculation.
 *
 * The signed size is derived rather than produced: signing needs the private
 * key, which a read-only verification pass has no business loading. The
 * envelope is a fixed JSON skeleton plus base64url of the document plus a
 * fixed-length signature, so its size is exact arithmetic, not an estimate.
 */
function verifyDocumentSize(
  entry: PrivateArtifactEntry
): ArtifactVerificationFailure[] {
  const document = privateArtifactManifestDocument(
    entry,
    new Date().toISOString()
  )
  const documentBytes = Buffer.byteLength(JSON.stringify(document), "utf8")

  const skeleton = JSON.stringify({
    v: 1,
    key_id: MANIFEST_SIGNING_KEY_ID,
    manifest_b64: "",
    sig: "s".repeat(SIGNATURE_BASE64URL_LENGTH),
  })
  const signedBytes =
    Buffer.byteLength(skeleton, "utf8") + Math.ceil((documentBytes * 4) / 3)

  const failures: ArtifactVerificationFailure[] = []
  if (documentBytes > MAX_MANIFEST_BYTES) {
    failures.push({
      id: "manifest_document_size",
      message: `The manifest document is ${documentBytes} bytes; the agent rejects anything above ${MAX_MANIFEST_BYTES}`,
    })
  }
  if (signedBytes > MAX_SIGNED_MANIFEST_BYTES) {
    failures.push({
      id: "signed_manifest_size",
      message: `The signed manifest envelope is ${signedBytes} bytes; the agent rejects anything above ${MAX_SIGNED_MANIFEST_BYTES}`,
    })
  }
  return failures
}

/**
 * A token-shaped string of exactly the length a real one would be, used only
 * to measure the document.
 *
 * Not a real token, and deliberately not: verification is a read-only check
 * that may run on a page load, and minting a live credential to measure a
 * string length would be a credential nobody asked for. The length is what
 * matters -- it appears once per published artifact URL -- and it is exact,
 * because a real token is `v1.<base64url(claims)>.<base64url(hmac-sha256)>`
 * over exactly these claims (`token.ts`). The signature half is a fixed 43
 * characters for SHA-256.
 */
function measurementToken(organizationId: string, artifactId: string): string {
  const claims = JSON.stringify({
    organizationId,
    artifactId,
    exp: Math.floor(Date.now() / 1000),
  })
  const encoded = Buffer.from(claims, "utf8").toString("base64url")
  return `v1.${encoded}.${"s".repeat(43)}`
}

/**
 * Builds the entry this artifact would publish and verifies it.
 *
 * Never throws for a *content* problem -- that is the point, the caller wants
 * the list. A misconfigured catalog origin is reported the same way and the
 * remaining checks still run against a placeholder origin, so an owner whose
 * deployment is misconfigured still sees whether their artifact itself is
 * sound.
 */
export async function verifyPrivateArtifact(input: {
  organizationId: string
  artifactId: string
  /** The real token and base URL when one is already in hand (the install
   * path), so the measured document is byte-identical to the served one. */
  baseUrl?: string
  token?: string
}): Promise<ArtifactVerification> {
  const failures: ArtifactVerificationFailure[] = []

  let baseUrl = input.baseUrl
  if (!baseUrl) {
    try {
      baseUrl = requireCatalogOriginBaseUrl()
    } catch (error) {
      if (!(error instanceof CatalogOriginError)) throw error
      failures.push({ id: "catalog_origin", message: error.message })
      // Same length class as a real origin, so the document measurement below
      // stays meaningful while the failure above names the real problem.
      baseUrl = "https://catalog-origin.invalid"
    }
  }

  const token =
    input.token ?? measurementToken(input.organizationId, input.artifactId)

  let entry: PrivateArtifactEntry
  try {
    entry = await buildPrivateArtifactEntry({
      organizationId: input.organizationId,
      artifactId: input.artifactId,
      token,
      baseUrl,
    })
  } catch (error) {
    // The builder reports a missing required content kind, a declared asset
    // with no stored counterpart, and an unreadable manifest.toml as a
    // `Response` -- 404 for an artifact that is not this org's, 409 for one
    // that is but cannot be published. A 404 is not a verification result and
    // must reach the caller as itself.
    if (error instanceof Response && error.status === 409) {
      failures.push({ id: "entry_publishable", message: await error.text() })
      return { ok: false, failures }
    }
    throw error
  }

  failures.push(...verifyPublishedEntry(entry))
  return { ok: failures.length === 0, failures }
}

/**
 * The gate in front of every action that hands an artifact to an agent.
 *
 * Throws a 409 naming every reason, matching how the rest of the private
 * artifact surface reports "this artifact is not in a state that supports the
 * thing you asked for".
 */
export async function assertPrivateArtifactPublishable(
  organizationId: string,
  artifactId: string,
  options: { baseUrl?: string; token?: string } = {}
) {
  const { ok, failures } = await verifyPrivateArtifact({
    organizationId,
    artifactId,
    ...options,
  })
  if (!ok) {
    throw new Response(
      `Artifact cannot be installed: ${failures.map((failure) => failure.message).join("; ")}`,
      { status: 409 }
    )
  }
}

/**
 * The same gate for a caller that has already built the entry, so the install
 * path does not build it twice. Throws an `Error` rather than a `Response`
 * because its caller (`createInstallIntent`) reports failures as JSON errors,
 * not as thrown HTTP responses.
 */
export function assertPublishedEntryInstallable(entry: PrivateArtifactEntry) {
  const failures = verifyPublishedEntry(entry)
  if (failures.length > 0) {
    throw new Error(
      `Artifact cannot be installed: ${failures.map((failure) => failure.message).join("; ")}`
    )
  }
}
