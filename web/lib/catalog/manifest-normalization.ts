import { parse } from "smol-toml"

import type { CapabilityManifest, LegacyCredential } from "./source-types"
import type { CatalogCredential } from "./types"

export type NormalizedToolSecurity = {
  auth: {
    model: string
    requiredSecrets: string[]
    optionalSecrets: string[]
    credentials: CatalogCredential[]
  }
  networkHosts: string[]
  effects: string[]
  defaultPermissions: string[]
}

export function normalizeToolSecurity(
  manifest: CapabilityManifest,
  rebornManifestText: string
): NormalizedToolSecurity {
  const legacy = normalizeLegacyManifest(manifest)
  const reborn = normalizeRebornManifest(rebornManifestText)
  const credentials =
    reborn.credentials.length > 0 ? reborn.credentials : legacy.credentials

  const requiredSecrets = unique(
    credentials
      .filter((credential) => credential.required)
      .map(getCredentialName)
  )
  const optionalSecrets = unique(
    credentials
      .filter((credential) => !credential.required)
      .map(getCredentialName)
  ).filter((name) => !requiredSecrets.includes(name))

  return {
    auth: {
      model: getAuthSummary(manifest, credentials),
      requiredSecrets,
      optionalSecrets,
      credentials,
    },
    networkHosts:
      reborn.networkHosts.length > 0
        ? reborn.networkHosts
        : legacy.networkHosts,
    effects: unique([...legacy.effects, ...reborn.effects]),
    defaultPermissions: reborn.defaultPermissions,
  }
}

function normalizeLegacyManifest(manifest: CapabilityManifest) {
  const container = manifest.capabilities ?? {}
  const http = manifest.http ?? container.http
  const secrets = manifest.secrets ?? container.secrets
  const setupSecrets = manifest.setup?.required_secrets ?? []
  const setupOptional = new Map(
    setupSecrets.flatMap((secret) =>
      secret.name ? [[secret.name, secret.optional === true] as const] : []
    )
  )
  const credentials = Object.entries(http?.credentials ?? {}).map(
    ([key, credential]) =>
      legacyCredentialToCatalogCredential(key, credential, setupOptional)
  )

  for (const name of secrets?.allowed_names ?? []) {
    if (!credentials.some((credential) => credential.name === name)) {
      credentials.push({
        name,
        method: "Host-managed credential",
        required: setupOptional.get(name) !== true,
        hosts: [],
      })
    }
  }

  for (const secret of setupSecrets) {
    if (
      secret.name &&
      !credentials.some((credential) => credential.name === secret.name)
    ) {
      credentials.push({
        name: secret.name,
        method: "Setup credential",
        required: secret.optional !== true,
        hosts: [],
      })
    }
  }

  if (
    manifest.auth?.secret_name &&
    !credentials.some(
      (credential) => credential.name === manifest.auth?.secret_name
    )
  ) {
    credentials.push({
      name: manifest.auth.secret_name,
      provider: manifest.auth.display_name,
      method: manifest.auth.oauth ? "OAuth 2.0" : "API credential",
      required: true,
      hosts: [],
    })
  }

  const mergedCredentials = mergeCredentials(credentials).map((credential) =>
    manifest.auth?.oauth &&
    (!manifest.auth.secret_name ||
      credential.name === manifest.auth.secret_name)
      ? {
          ...credential,
          provider: manifest.auth.display_name ?? credential.provider,
          method: manifest.auth.oauth.use_pkce
            ? "OAuth 2.0 with PKCE"
            : "OAuth 2.0",
        }
      : credential
  )

  return {
    credentials: mergedCredentials,
    networkHosts: unique(
      (http?.allowlist ?? []).flatMap((entry) =>
        entry.host ? [entry.host] : []
      )
    ),
    effects: unique([
      ...(manifest.effects ?? []),
      ...(container.effects ?? []),
    ]),
  }
}

function legacyCredentialToCatalogCredential(
  key: string,
  credential: LegacyCredential,
  setupOptional: Map<string, boolean>
): CatalogCredential {
  const name = credential.secret_name ?? key
  return {
    name,
    method: formatCredentialMethod(
      credential.location?.type,
      credential.location?.name,
      credential.location?.prefix
    ),
    required: credential.optional !== true && setupOptional.get(name) !== true,
    hosts: unique(credential.host_patterns ?? []),
  }
}

function normalizeRebornManifest(text: string) {
  if (!text.trim()) return EMPTY_REBORN_SECURITY

  try {
    const document = asRecord(parse(text))
    if (document.schema_version !== "reborn.extension_manifest.v2") {
      return EMPTY_REBORN_SECURITY
    }

    const provider = asRecord(document.capability_provider)
    const tools = asRecord(provider.tools)
    const capabilities = asRecordArray(tools.capabilities)
    const rawCredentials: Array<CatalogCredential & { capabilityId: string }> =
      []

    for (const capability of capabilities) {
      const capabilityId = readString(capability.id) ?? ""
      for (const rawCredential of asRecordArray(
        capability.runtime_credentials
      )) {
        const source = asRecord(rawCredential.source)
        const audience = asRecord(rawCredential.audience)
        const target = asRecord(rawCredential.target)
        const handle = readString(rawCredential.handle)
        if (!handle) continue

        rawCredentials.push({
          capabilityId,
          name: handle,
          provider: readString(source.provider),
          method: formatCredentialMethod(
            readString(target.type),
            readString(target.name),
            readString(target.prefix)
          ),
          required: rawCredential.required !== false,
          hosts: unique([readString(audience.host_pattern)].filter(isString)),
        })
      }
    }

    const credentials = aggregateRebornCredentials(
      rawCredentials,
      capabilities.length
    )

    return {
      credentials,
      networkHosts: unique(
        credentials.flatMap((credential) => credential.hosts)
      ),
      effects: unique(
        capabilities.flatMap((capability) =>
          readStringArray(capability.effects)
        )
      ),
      defaultPermissions: unique(
        capabilities.flatMap((capability) => {
          const permission = readString(capability.default_permission)
          return permission ? [permission] : []
        })
      ),
    }
  } catch {
    return EMPTY_REBORN_SECURITY
  }
}

function aggregateRebornCredentials(
  credentials: Array<CatalogCredential & { capabilityId: string }>,
  capabilityCount: number
) {
  const groups = new Map<
    string,
    Array<CatalogCredential & { capabilityId: string }>
  >()

  for (const credential of credentials) {
    const key = [credential.name, credential.provider, credential.method].join(
      "\u0000"
    )
    groups.set(key, [...(groups.get(key) ?? []), credential])
  }

  return Array.from(groups.values()).map((entries) => {
    const capabilityIds = unique(entries.map((entry) => entry.capabilityId))
    return {
      name: entries[0].name,
      provider: entries[0].provider,
      method: entries[0].method,
      required:
        capabilityCount > 0 &&
        capabilityIds.length === capabilityCount &&
        entries.every((entry) => entry.required),
      hosts: unique(entries.flatMap((entry) => entry.hosts)),
    }
  })
}

function getAuthSummary(
  manifest: CapabilityManifest,
  credentials: CatalogCredential[]
) {
  if (manifest.auth?.oauth) {
    return manifest.auth.oauth.use_pkce ? "OAuth 2.0 with PKCE" : "OAuth 2.0"
  }

  const methods = unique(credentials.map((credential) => credential.method))
  if (methods.length === 0) return "No credentials required"
  return methods.join(" + ")
}

function getCredentialName(credential: CatalogCredential) {
  return credential.name
}

function formatCredentialMethod(
  type: string | undefined,
  name: string | undefined,
  prefix: string | undefined
) {
  const normalizedType = type?.toLowerCase()
  const normalizedName = name?.toLowerCase()
  const normalizedPrefix = prefix?.trim().toLowerCase()

  if (normalizedType === "basic") return "Basic authentication"
  if (normalizedType === "bearer") return "Bearer token"
  if (normalizedType === "query_param") return "Query parameter"
  if (normalizedType === "url_placeholder") return "URL credential"
  if (normalizedType === "header") {
    if (
      normalizedPrefix === "basic" ||
      (normalizedName === "authorization" && normalizedPrefix === "basic")
    ) {
      return "Basic authentication"
    }
    if (
      normalizedPrefix === "bearer" ||
      (normalizedName === "authorization" && normalizedPrefix !== "basic")
    ) {
      return "Bearer token"
    }
    return "API key header"
  }
  return "Injected credential"
}

function mergeCredentials(credentials: CatalogCredential[]) {
  const groups = new Map<string, CatalogCredential[]>()
  for (const credential of credentials) {
    const key = [credential.name, credential.provider, credential.method].join(
      "\u0000"
    )
    groups.set(key, [...(groups.get(key) ?? []), credential])
  }

  return Array.from(groups.values()).map((entries) => ({
    ...entries[0],
    required: entries.every((entry) => entry.required),
    hosts: unique(entries.flatMap((entry) => entry.hosts)),
  }))
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isString) : []
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

const EMPTY_REBORN_SECURITY = {
  credentials: [] as CatalogCredential[],
  networkHosts: [] as string[],
  effects: [] as string[],
  defaultPermissions: [] as string[],
}
