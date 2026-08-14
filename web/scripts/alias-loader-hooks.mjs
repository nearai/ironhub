import { fileURLToPath, pathToFileURL } from "node:url"

const projectRoot = fileURLToPath(new URL("..", import.meta.url))

const EXTENSION_CANDIDATES = ["", ".ts", "/index.ts", ".tsx", "/index.tsx"]

async function resolveWithExtensions(target, context, nextResolve) {
  let lastError
  for (const suffix of EXTENSION_CANDIDATES) {
    try {
      return await nextResolve(`${target}${suffix}`, context)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = pathToFileURL(`${projectRoot}${specifier.slice(2)}`).href
    return resolveWithExtensions(target, context, nextResolve)
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    try {
      return await nextResolve(specifier, context)
    } catch {
      return resolveWithExtensions(specifier, context, nextResolve)
    }
  }

  return nextResolve(specifier, context)
}
