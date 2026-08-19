import assert from "node:assert/strict"
import test from "node:test"

import { validateAgentUrl } from "./validation.ts"

// The agent URL is the target of a server-side POST from the hub, so this
// validator is the SSRF boundary. `IRONHUB_ALLOW_LOCAL_ORIGINS` moves that
// boundary for local development, and these tests pin how far.
//
// Every case below uses an IP literal so `resolvePublicAddresses` takes its
// no-DNS path -- the assertions are about the rules, not about a resolver.

// Awaits `run` before restoring: every validator here is async, and a
// synchronous finally would put the environment back at the first await --
// which is exactly far enough for the first assertion in a block to pass and
// the second to fail.
async function withEnv(vars, run) {
  const originals = Object.fromEntries(
    Object.keys(vars).map((key) => [key, process.env[key]])
  )
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await run()
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const dev = { NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: "true" }
const off = { NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: undefined }

test("without the flag, http and private addresses are both refused", async () => {
  await withEnv(off, async () => {
    await assert.rejects(
      () => validateAgentUrl("http://127.0.0.1:4500"),
      /must use https/
    )
    await assert.rejects(
      () => validateAgentUrl("https://127.0.0.1:4500"),
      /must resolve to a public address/
    )
  })
})

test("without the flag, the refusal names the flag", async () => {
  await withEnv(off, async () => {
    await assert.rejects(
      () => validateAgentUrl("http://127.0.0.1:4500"),
      /IRONHUB_ALLOW_LOCAL_ORIGINS=true/
    )
  })
})

test("with the flag, a local agent over http is accepted", async () => {
  await withEnv(dev, async () => {
    assert.equal(
      await validateAgentUrl("http://127.0.0.1:4500"),
      "http://127.0.0.1:4500"
    )
    assert.equal(
      await validateAgentUrl("http://localhost:4500"),
      "http://localhost:4500"
    )
    assert.equal(await validateAgentUrl("http://[::1]:4500"), "http://[::1]:4500")
  })
})

test("with the flag, a public host is held to every original rule", async () => {
  await withEnv(dev, async () => {
    // The flag keys off the host. A public name gets no scheme relaxation...
    await assert.rejects(
      () => validateAgentUrl("http://8.8.8.8"),
      /must use https/
    )
    // ...and a public-looking IP outside the local ranges is still refused as
    // a target even over https if it is not unicast.
    await assert.rejects(
      () => validateAgentUrl("https://224.0.0.1"),
      /must resolve to a public address/
    )
  })
})

test("a production build vetoes the flag entirely", async () => {
  await withEnv(
    { NODE_ENV: "production", IRONHUB_ALLOW_LOCAL_ORIGINS: "true" },
    async () => {
      await assert.rejects(
        () => validateAgentUrl("http://127.0.0.1:4500"),
        /must use https/
      )
      await assert.rejects(
        () => validateAgentUrl("https://127.0.0.1:4500"),
        /must resolve to a public address/
      )
    }
  )
})

test("a malformed URL is still a malformed URL", async () => {
  await withEnv(dev, async () => {
    await assert.rejects(() => validateAgentUrl("not a url"), /valid URL/)
  })
})
