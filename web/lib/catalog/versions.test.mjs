import assert from "node:assert/strict"
import test from "node:test"

import {
  createVersionResolver,
  entryDigest,
  toUnchanged,
  toVersionIndex,
} from "./versions.ts"

const artifact = (sha256) => ({
  url: `https://hub.ironclaw.com/${sha256}`,
  size_bytes: 1,
  sha256,
})

const manifest = (overrides = {}) => ({
  version: "1",
  generated_at: "2026-07-31T00:00:00.000Z",
  release_tag: "release-2026-07-31-1",
  repo: "nearai/ironhub",
  tools: [],
  skills: [],
  ...overrides,
})

const tool = (overrides = {}) => ({
  name: "attio",
  crate_name: "attio-tool",
  version: "0.1.0",
  description: "",
  provenance: "official",
  wasm: artifact("a".repeat(64)),
  capabilities: artifact("b".repeat(64)),
  ...overrides,
})

const skill = (overrides = {}) => ({
  name: "chief-of-staff",
  trunk: "",
  version: "1.0.0",
  description: "",
  provenance: "official",
  skill_md: artifact("c".repeat(64)),
  ...overrides,
})

const digestOf = (entries, kind, name) =>
  entries.find((entry) => entry.kind === kind && entry.name === name).digest

test("a manifest-only change moves the tool digest", () => {
  const before = toVersionIndex(manifest({ tools: [tool()] })).entries
  const after = toVersionIndex(
    manifest({ tools: [tool({ manifest: artifact("d".repeat(64)) })] })
  ).entries

  assert.notEqual(
    digestOf(before, "tool", "attio"),
    digestOf(after, "tool", "attio")
  )
})

test("a schema-only change moves the tool digest", () => {
  const path = "schemas/attio/invoke.input.v1.json"
  const before = toVersionIndex(
    manifest({
      tools: [tool({ schemas: { [path]: artifact("1".repeat(64)) } })],
    })
  ).entries
  const after = toVersionIndex(
    manifest({
      tools: [tool({ schemas: { [path]: artifact("2".repeat(64)) } })],
    })
  ).entries

  assert.notEqual(
    digestOf(before, "tool", "attio"),
    digestOf(after, "tool", "attio")
  )
})

test("tool schema ordering does not change the digest", () => {
  const first = {
    "schemas/attio/a.json": artifact("1".repeat(64)),
    "schemas/attio/b.json": artifact("2".repeat(64)),
  }
  const second = {
    "schemas/attio/b.json": artifact("2".repeat(64)),
    "schemas/attio/a.json": artifact("1".repeat(64)),
  }

  const before = toVersionIndex(
    manifest({ tools: [tool({ schemas: first })] })
  ).entries
  const after = toVersionIndex(
    manifest({ tools: [tool({ schemas: second })] })
  ).entries

  assert.equal(
    digestOf(before, "tool", "attio"),
    digestOf(after, "tool", "attio")
  )
})

test("a script change moves the skill digest while SKILL.md is untouched", () => {
  const files = [{ path: "python_scripts/run.py", ...artifact("1".repeat(64)) }]
  const changed = [
    { path: "python_scripts/run.py", ...artifact("2".repeat(64)) },
  ]

  const before = toVersionIndex(manifest({ skills: [skill({ files })] })).entries
  const after = toVersionIndex(
    manifest({ skills: [skill({ files: changed })] })
  ).entries

  assert.notEqual(
    digestOf(before, "skill", "chief-of-staff"),
    digestOf(after, "skill", "chief-of-staff")
  )
})

test("adding or removing a skill file moves the digest", () => {
  const one = [{ path: "a.py", ...artifact("1".repeat(64)) }]
  const two = [...one, { path: "b.py", ...artifact("2".repeat(64)) }]

  const before = toVersionIndex(
    manifest({ skills: [skill({ files: one })] })
  ).entries
  const after = toVersionIndex(
    manifest({ skills: [skill({ files: two })] })
  ).entries

  assert.notEqual(
    digestOf(before, "skill", "chief-of-staff"),
    digestOf(after, "skill", "chief-of-staff")
  )
})

test("skill file ordering does not change the digest", () => {
  const ordered = [
    { path: "a.py", ...artifact("1".repeat(64)) },
    { path: "b.py", ...artifact("2".repeat(64)) },
  ]
  const reversed = [...ordered].reverse()

  const first = toVersionIndex(
    manifest({ skills: [skill({ files: ordered })] })
  ).entries
  const second = toVersionIndex(
    manifest({ skills: [skill({ files: reversed })] })
  ).entries

  assert.equal(
    digestOf(first, "skill", "chief-of-staff"),
    digestOf(second, "skill", "chief-of-staff")
  )
})

test("the encoding stays injective if an artifact identity is ever variable-width", () => {
  assert.notEqual(
    entryDigest([artifact("ab"), artifact("c")]),
    entryDigest([artifact("a"), artifact("bc")])
  )
})

test("two real fixed-width digests do not collide when their order swaps", () => {
  const first = artifact("1".repeat(64))
  const second = artifact("2".repeat(64))

  assert.notEqual(
    entryDigest([first, second]),
    entryDigest([second, first])
  )
})

test("an absent artifact is distinct from an empty one", () => {
  assert.notEqual(entryDigest([undefined]), entryDigest([undefined, undefined]))
})

test("entries are ordered independently of manifest order", () => {
  const forward = toVersionIndex(
    manifest({ tools: [tool({ name: "zeta" }), tool({ name: "alpha" })] })
  ).entries
  const backward = toVersionIndex(
    manifest({ tools: [tool({ name: "alpha" }), tool({ name: "zeta" })] })
  ).entries

  assert.deepEqual(
    forward.map((entry) => entry.name),
    backward.map((entry) => entry.name)
  )
})

test("the unchanged reply keeps identity and drops entries", () => {
  const index = toVersionIndex(manifest({ tools: [tool()] }))
  const unchanged = toUnchanged(index)

  assert.deepEqual(unchanged, {
    version: "1",
    generated_at: index.generated_at,
    release_tag: index.release_tag,
    repo: index.repo,
    unchanged: true,
  })
  assert.equal("entries" in unchanged, false)
})

const resolverFixture = () => {
  let calls = 0
  let clock = 0
  const resolve = createVersionResolver({
    load: async () => {
      calls += 1
      return toVersionIndex(
        manifest({ release_tag: `release-${calls}`, tools: [tool()] })
      )
    },
    ttlMs: 1000,
    staleMs: 60_000,
    now: () => clock,
  })
  return {
    resolve,
    calls: () => calls,
    advance: (ms) => {
      clock += ms
    },
  }
}

test("a cached index is reused inside the ttl and rebuilt after it", async () => {
  const fixture = resolverFixture()

  await fixture.resolve()
  await fixture.resolve()
  assert.equal(fixture.calls(), 1)

  fixture.advance(1001)
  await fixture.resolve()
  assert.equal(fixture.calls(), 2)
})

test("a matching since returns unchanged, a stale one returns the full index", async () => {
  const fixture = resolverFixture()

  const full = await fixture.resolve()
  const unchanged = await fixture.resolve(full.release_tag)
  const stale = await fixture.resolve("release-from-last-week")

  assert.equal(unchanged.unchanged, true)
  assert.equal("entries" in unchanged, false)
  assert.deepEqual(stale.entries, full.entries)
})

test("an absent since always returns the full index", async () => {
  const fixture = resolverFixture()

  assert.ok((await fixture.resolve()).entries)
  assert.ok((await fixture.resolve(null)).entries)
  assert.ok((await fixture.resolve("")).entries)
})

test("concurrent misses collapse into a single build", async () => {
  const fixture = resolverFixture()

  const results = await Promise.all([
    fixture.resolve(),
    fixture.resolve(),
    fixture.resolve(),
  ])

  assert.equal(fixture.calls(), 1)
  assert.equal(new Set(results.map((r) => r.release_tag)).size, 1)
})

test("unchanged is never served for a release the caller has not seen", async () => {
  const fixture = resolverFixture()

  const first = await fixture.resolve()
  fixture.advance(1001)
  const afterRelease = await fixture.resolve(first.release_tag)

  assert.equal(afterRelease.unchanged, undefined)
  assert.notEqual(afterRelease.release_tag, first.release_tag)
})

const failingResolverFixture = ({ staleMs }) => {
  let fail = false
  let clock = 0
  let staleCalls = 0
  const resolve = createVersionResolver({
    load: async () => {
      if (fail) {
        throw new Error("upstream unavailable")
      }
      return toVersionIndex(manifest({ tools: [tool()] }))
    },
    ttlMs: 1000,
    staleMs,
    now: () => clock,
    onStale: () => {
      staleCalls += 1
    },
  })
  return {
    resolve,
    breakUpstream: () => {
      fail = true
    },
    advance: (ms) => {
      clock += ms
    },
    staleCalls: () => staleCalls,
  }
}

test("a rebuild failure serves the cached index rather than failing the request", async () => {
  const fixture = failingResolverFixture({ staleMs: 60_000 })

  const fresh = await fixture.resolve()
  fixture.breakUpstream()
  fixture.advance(1001)
  const served = await fixture.resolve()

  assert.equal(served.release_tag, fresh.release_tag)
  assert.equal(fixture.staleCalls(), 1)
})

test("a cached index past the stale limit fails rather than being served", async () => {
  const fixture = failingResolverFixture({ staleMs: 5000 })

  await fixture.resolve()
  fixture.breakUpstream()
  fixture.advance(5001)

  await assert.rejects(() => fixture.resolve(), /upstream unavailable/)
})

test("a first-ever load failure has nothing to fall back to and throws", async () => {
  const fixture = failingResolverFixture({ staleMs: 60_000 })

  fixture.breakUpstream()
  await assert.rejects(() => fixture.resolve(), /upstream unavailable/)
  assert.equal(fixture.staleCalls(), 0)
})

test("a recovered upstream replaces the stale index", async () => {
  let fail = false
  let clock = 0
  let tag = 1
  const resolve = createVersionResolver({
    load: async () => {
      if (fail) {
        throw new Error("upstream unavailable")
      }
      return toVersionIndex(manifest({ release_tag: `release-${tag}` }))
    },
    ttlMs: 1000,
    staleMs: 60_000,
    now: () => clock,
  })

  await resolve()
  fail = true
  clock += 1001
  assert.equal((await resolve()).release_tag, "release-1")

  fail = false
  tag = 2
  clock += 1001
  assert.equal((await resolve()).release_tag, "release-2")
})
