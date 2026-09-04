// Registers a minimal ESM resolve hook so plain `node --test` runs can import
// modules using the same "@/..." alias defined in tsconfig.json (mapped to
// the project root), without pulling in the full Next.js/webpack toolchain.
import { register } from "node:module"
import { pathToFileURL } from "node:url"

register("./alias-loader-hooks.mjs", import.meta.url)

void pathToFileURL // keep import graph explicit for tooling
