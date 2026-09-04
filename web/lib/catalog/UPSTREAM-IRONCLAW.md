# Upstream IronClaw issues the hub works around

Every workaround in the private-catalog path exists because of one of the
issues below. Each is isolated behind a named symbol so removal is mechanical
rather than archaeological: when an issue lands, delete what its **Remove when
fixed** section names and nothing else.

Paths prefixed `ironclaw:` are relative to the IronClaw checkout beside this
repo; unprefixed paths are relative to `web/`. Constraint numbers (C*) and
defect numbers (D*) refer to
`openspec/changes/fix-private-catalog-ironclaw-contract/design.md`, which
records how each was verified in the agent source.

It lives here rather than under `openspec/` because `openspec/` is gitignored,
and because every symbol it names is in this directory or one level below it.

This file outlives the change that created it. Keep it current: it is the only
place that says which hub code is load-bearing and which is scaffolding.

---

## 1. Catalog-origin lock-in (C3 + C4)

**What upstream does.** The agent accepts a configured catalog URL
(`IRONHUB_MANIFEST_URL`) only if its host passes a hardcoded allowlist --
`hub.ironclaw.com`, `github.com`, `*.githubusercontent.com` (`service.rs`
`validated_manifest_url` -> `artifact_hosts.rs` `is_allowed_artifact_host`).
Separately, `catalog.rs` `host_is_disallowed_target` rejects bare IPs,
`localhost`, any dotless host, and the `.local` / `.internal` / `.intranet` /
`.lan` / `.home` / `.corp` / `.private` suffixes.

**Why it is a bug.** The setting exists to point the agent at a different hub,
and the allowlist means it cannot. A self-hosted IronHub is unconfigurable.

**What it costs us.**

- No end-to-end install test against a real agent is possible from a developer
  machine or from CI: there is no host that both resolves locally and passes
  the allowlist. This is why tasks 12.1 and 12.2 of the change are unticked.
- `lib/catalog/catalog-origin.ts` has to enforce the *second* rule
  (`host_is_disallowed_target`) hub-side so a misconfiguration fails locally
  with a message naming `NEXT_PUBLIC_APP_URL`, instead of remotely with an
  agent error naming the agent's own configuration.

**Suggested upstream fix.** Drop the allowlist for the operator-configured
catalog URL; keep `host_is_disallowed_target`. The origin check that every
private manifest and artifact URL is validated against (C1/C2) already provides
the confinement the allowlist was reaching for, and it works for any host.

**Workaround (works on a stock agent).** The allowlist is a match on the host
*string*, and nothing pins the address that string resolves to. So point the
allowlisted name at the hub instead of changing the name:

1. Give the machine running the agent a DNS override -- `/etc/hosts`, a
   `dnsmasq` entry, or a container `--add-host` -- mapping `hub.ironclaw.com`
   to the hub.
2. That address must not be private or loopback. `resolve_public_ips`
   (`ironclaw:crates/substrates/ironclaw_network/src/resolver.rs`) rejects any
   resolution to a private, loopback, link-local, CGNAT, broadcast, multicast,
   `0.0.0.0/8` or *documentation* range, so `127.0.0.1` and `203.0.113.x` alike
   are refused. `198.18.0.0/15` (RFC 2544 benchmarking) is in none of those
   sets: bind e.g. `198.18.0.1` to a dummy interface and serve the hub there.
3. Serve https on it with a certificate for `hub.ironclaw.com` from a CA in the
   machine's **OS trust store**. `ironclaw_network` builds reqwest with
   `rustls-tls-native-roots`, so an `mkcert` root is honoured -- no agent patch
   and no public CA needed.

That satisfies every rule as written: the host string is on the allowlist, it
has a dot and no reserved suffix, the scheme is https, and the resolved address
is public-shaped. It is a lab and CI technique -- it should never be how a
customer self-hosts, which is what the upstream fix is for.

**Remove when fixed.** Nothing in `catalog-origin.ts` -- its rules are the
agent's `host_is_disallowed_target`, which should stay. What changes is the
documentation: the "cannot be used to test against a real agent" note in
`.env.example` and the header comment in `catalog-origin.ts` explaining why
C3 is deliberately not enforced there, and the DNS-override workaround above
stops being needed. Re-run the E2E procedure at the bottom of this file and
tick tasks 12.1 and 12.2.

---

## 1b. Small artifacts are undownloadable when the artifact URL is long

**What upstream does.** `catalog.rs` `network_policy_for_url_from_origin` sets
`max_egress_bytes: Some(max_bytes)`, where `max_bytes` is the artifact's
expected size, taken from `download_verified`. But `max_egress_bytes` bounds the
**request** estimate -- method + URL + headers + body, computed by
`estimate_http_request_bytes` -- not the response. `authorize_static_policy`
compares the two and denies before a connection is opened.

**Why it is a bug.** Request budget is being set from a response size. Any
artifact whose byte size is smaller than the length of its own URL cannot be
downloaded. This is not a local-only problem: production artifact URLs are
`https://hub.ironclaw.com/api/catalog/artifact/<base64-ref>`, comparable in
length to ours, so small published schemas are affected there too.

**How it surfaced.** `ironhub install firecrawl` against a local catalog failed
with `policy_denied`. Its smallest schema is 259 bytes; the artifact URL is 269
characters.

**Suggested upstream fix.** `max_egress_bytes: None` here. The response is
already bounded twice -- `response_body_limit` on the request, and
`download_verified`'s exact size and SHA-256 check -- and these GETs carry no
body and no headers, so there is no request volume to cap. If a request cap is
wanted, derive it from the request, not from the artifact size.

**The exact rule.** `estimate_http_request_bytes` counts
`"GET " + url + " HTTP/1.1\r\n"` plus each header plus a trailing `"\r\n"` plus
the body. `download_url` sends no headers and no body, so for these GETs the
estimate is exactly **`len(url) + 17`**, and an artifact downloads only if

    size_bytes >= len(artifact_url) + 17

With production-shaped URLs that floor is about **300-330 bytes**: a
`https://hub.ironclaw.com/api/private-artifacts/<cuid>/asset/schema/<token>/<path>`
URL runs ~300 characters, of which 186 are the capability token (`v1.` + a
139-char base64url claims blob + a 43-char HMAC). The `content/capabilities`
URL is ~280, so the two-byte `{}` stub that issue 2 forces us to publish is
**guaranteed** to be denied on a stock agent -- which means today *no private
manifest v3 tool installs on an unpatched agent at all*, and the E2E in the
session report passed only because the local build carries `max_egress_bytes:
None`.

**Workaround (works on a stock agent).** Both sides of the inequality are ours,
so satisfy it: publish every metadata artifact at a size at or above the floor.

- *Pad the bytes.* Trailing whitespace is insignificant in JSON (RFC 8259
  allows it around any value, and `serde_json::from_slice` accepts it) and
  invisible in Markdown, and nothing reads `capabilities.json` at all. So a
  single pure `padToEgressFloor(bytes, floor)` -- newlines appended until the
  length reaches the floor -- makes any artifact downloadable without changing
  what it means.
- *Apply it in exactly two places*, both derived from one constant: where the
  manifest entry's `size_bytes`/`sha256` are computed, and where the content
  and asset routes stream the bytes. Digest, declared size and served bytes then
  agree by construction, which is the same invariant D4 was about. Keep the
  uploaded object pristine in storage and pad on the way out; do not pad at
  ingest.
- *Derive the floor from the longest URL the hub can mint*, not from the URL of
  the moment: the token's length is fixed (ids and a 10-digit `exp`), so
  `EGRESS_REQUEST_FLOOR_BYTES = len(baseUrl) + longest route + token + longest
  declared asset path + 17`. Round up. A fixed 512 for every metadata artifact
  is the conservative choice and costs nothing.
- *Optional, and separate:* shortening the URL reduces how much padding is
  needed but cannot replace it -- a 0-byte prompt doc is legal and would still
  fail. If it is worth doing, the token is the bulk of it: `organizationId` is
  derivable from `artifactId` and need not be in the claims, and a 128-bit
  truncated HMAC is 22 characters rather than 43.

The wasm and skill_md artifacts are already far above any floor; this is a
metadata-artifact concern only.

**Remove when fixed.** `padToEgressFloor`, `EGRESS_REQUEST_FLOOR_BYTES`, and
their two call sites. Nothing else depends on them -- an unpadded artifact and
a padded one differ only in trailing whitespace, so removing the workaround
changes published digests but no meaning. The local dev agent build patches
this directly instead (`max_egress_bytes: None`), which is why the workaround
is not in the tree yet.

---

## 1c. A failed install delivery is undiagnosable from either side

**What upstream does.** Three separate layers discard the failure reason before
it reaches anything -- not just the HTTP caller, but the agent's own logs:

- `map_install_error` (`ironhub/link_service.rs`) collapses every
  `IronHubCommandError::Product(_)` to the fixed string
  `"extension lifecycle failed"`, dropping the inner `ProductOperationFailure`.
- `map_ironhub_link_error` (`ironclaw_assistant/.../ironhub_link.rs`) maps
  `IronhubLinkError::InvalidInput { reason }` to a bare validation error and
  `::Install { reason }` to `internal_invariant()`, discarding both reasons.
- Nothing logs either one at any level.

**Why it is a bug.** Redacting the reason from the *response* is right -- a
product-surface caller should not see internals. Dropping it entirely is not.
A hub operator sees `{"error":"invalid_request","field":"input"}` or
`{"error":"internal"}` with no way to find out what failed.

**What it cost us.** Three agent rebuilds during end-to-end bring-up purely to
read error strings the agent already had. Once surfaced, both were immediately
actionable, and both were our own fixture's fault:

- `catalog lists 'e2e-firecrawl' but its published manifest declares id 'firecrawl'`
- `InvalidBindingRequest { reason: "capability id firecrawl.scrape must be provider-prefixed with 'e2e-firecrawl.' (extension id)" }`

**Suggested upstream fix.** Keep the response redacted; add
`tracing::error!(%reason, ...)` at both mapping sites, and carry the inner
`ProductOperationFailure` into the `Install` reason instead of a fixed string.

**Remove when fixed.** Nothing hub-side. The three dev-build log patches are
local to the agent checkout.

---

## 2. `capabilities.json` is required for nothing (C7 + D3)

**What upstream does.** `IronHubToolEntry.capabilities` has no serde default
(`ironclaw:.../ironhub/model.rs:100`), so a catalog entry without it fails the
parse of the **entire** manifest, not just that entry. The bytes are then
downloaded, digest-verified, written to `legacy/capabilities.json`
(`ironclaw:.../ironhub/package.rs:52`) and never read again -- a repo-wide
search finds no parse, no validation, and no consumer.

**Why it is a bug.** A manifest v3 extension carries its metadata in
`manifest.toml`, which owns effects, default permission, and the secrets handle
list that `*.capabilities.json` used to carry. Such an extension legitimately
ships no capabilities document, and cannot be published.

**What it costs us.** The hub signs and serves two bytes of `{}` that nobody
reads, and every private tool entry advertises a size and digest for them.

**Suggested upstream fix.** `#[serde(default)]` on the field, and make the
download conditional. The digest formula (C13) hashes
`capabilities:{sha}\0` unconditionally, so either that segment becomes
conditional too or the empty-document digest stands in for an absent one --
upstream's call, and the reason this is not simply a one-line patch.

**Remove when fixed.**

- `CAPABILITIES_STUB_TEXT`, `CAPABILITIES_STUB_SIZE_BYTES`,
  `CAPABILITIES_STUB_SHA256`, and `capabilitiesStubBytes()` in
  `lib/catalog/ironclaw-contract.ts`.
- `capabilitiesStubArtifact()` in `lib/private-artifacts/manifest.ts`, and
  the `byKind.has("capabilities") ? ... : ...` fallback that calls it.
- The 404 fallback branch in
  `app/api/private-artifacts/[id]/content/[kind]/[token]/route.ts`.
- The non-optional `capabilities` field on `HubToolEntryInput`
  (`lib/catalog/hub-entry.ts`) and the throw in `toolEntryArtifactDigest`,
  both of which exist to make "no capabilities" unrepresentable.
- Whatever the fixed digest formula requires in `toolArtifactDigest`.

---

## 3. `standard_op` tools cannot be installed via IronHub (C18 + D9)

**What upstream does.** A v3 tool bound to a `standard_op` declares no
`input_schema_ref` -- `v3.rs:528` rejects one if present -- and the host
synthesizes the ref as `standard:messaging/<op>.input.v1`. Four call sites
exempt that prefix from asset resolution (`available_extensions.rs:931` and
`:1412`, `capability_catalog.rs:161`, `surface.rs:339`). Two do not:
`ironhub/package.rs`'s asset-set equality check and
`available_extension_import.rs`'s `manifest_declared_asset_paths`. Both
therefore demand a published artifact at that literal path.

**Why it is a bug.** The two IronHub-path checks disagree with the four
resolution sites about the same synthesized ref, so a tool that works when
installed by any other route cannot be installed from a hub.

**What it costs us.** Nothing is published for such a tool, deliberately. The
path would pass `ExtensionAssetPath` (C19 -- it contains `:` but no `://`), so
a hub *could* satisfy the check by publishing a fabricated document at that key
which the agent would download, store, and then ignore in favour of its
compiled-in canonical schema. That is the `capabilities.json` anti-pattern a
second time and we are not doing it. Ingest declares nothing and such a tool
fails at install.

**Suggested upstream fix.** Add the `STANDARD_SCHEMA_REF_PREFIX` exemption to
`package.rs` and to `manifest_declared_asset_paths`, matching the four sites
that already have one.

**Workaround (works on a stock agent, with a real cost).** The two checks want
a file at that path and never read it, so publishing one satisfies them:

1. Widen the hub's asset-path grammar. `isExtensionAssetPath`
   (`lib/catalog/ironclaw-contract.ts`) admits only `[A-Za-z0-9._/-]`, so it
   rejects the `:`. Admit the single literal prefix `standard:messaging/`
   rather than colons generally -- the rest of the path stays in the strict
   subset, and the agent's own `ExtensionAssetPath` accepts the result (no
   `://`, no leading `/`, and `looks_like_windows_path` does not fire because
   the colon is at index 8, not index 1).
2. In ingest, treat a ref on that prefix as *not required from the bundle*:
   synthesize the asset instead of demanding the publisher ship it.
3. Fill it with the agent's own canonical text, copied byte-for-byte from
   `ironclaw:crates/contracts/ironclaw_host_api/schemas/messaging/<op>.<dir>.<ver>.json`
   -- the same files `resolve_standard_schema_ref` compiles in. That is the one
   thing that makes this different from the `capabilities.json` stub: the
   document we publish is not fabricated, it is a mirror of what the agent
   already believes, so if some site ever does read it the answer is right.
   Pin the agent version the copy was taken from, next to the other constants.

**Why we still have not written it.** The workaround inverts when the fix
lands. Upstream's fix removes the ref from `referenced_schemas`, at which point
a hub that publishes the asset produces `unreferenced: ["standard:messaging/..."]`
and the set-equality check fails in the other direction -- the same install
breaks on a *fixed* agent. The hub cannot branch on agent version, because it
does not learn one: `AgentInstallation` records a URL, a label and a key, and
no version handshake exists. So shipping this buys standard_op tools on today's
agents and costs them on tomorrow's, with no way to serve both.

If it is shipped anyway, ask upstream to make the fix **tolerant rather than
exclusive**: skip the `STANDARD_SCHEMA_REF_PREFIX` on both sides -- drop it
from `referenced_schemas` *and* ignore a published asset carrying it -- so an
old hub keeps working against a new agent. With that, the workaround is safe to
ship immediately and safe to leave in.

**Remove when fixed.** If the workaround above is never written, nothing --
this is the one we declined. What changes either way is that `declaredAssetPaths`
in `lib/private-artifacts/bundle.ts` may then need to *skip* refs on that prefix
rather than treat them as ordinary declared assets, if upstream keeps
synthesizing them into the manifest the hub reads.

---

## 4. `deliver_install` has no surface a hub can reach

**What upstream does.** The agent implements `deliver_install` completely --
request type, HMAC verification, timestamp and nonce checks, install execution
(`ironclaw:.../ironhub/link_service.rs`) -- and exposes it at exactly one
address: `POST /api/webchat/v2/ironhub/install`
(`ironclaw:.../webui_v2/descriptors.rs:215`, mounted at
`ironclaw:.../webui_v2/router.rs:457`), whose handler
(`ironclaw:.../webui_v2/handlers.rs:2792`) extracts `ProductSurfaceCaller` --
an authenticated WebUI session.

Meanwhile the public HMAC gateway mounts one route only:
`IRONHUB_REGISTER_PATH = "/api/ironhub/register"`
(`ironclaw:crates/app/ironclaw_composition/src/ironhub_link_serve.rs:24`).
There is no install counterpart.

And the deep link we emit, `{agentUrl}/#/install/{slug}?...`, reaches nothing:
the WebUI is a `BrowserRouter` (`ironclaw:.../frontend/src/app/app.tsx:1,213`),
its route table (`app.tsx:215-256`) has no install route, and the catch-all at
`app.tsx:256` navigates to `defaultRoute` (`/chat`). A recursive search for
`ironhub` across `ironclaw:.../frontend/src` returns zero matches.

**Why it is a bug.** Registration and delivery are two halves of one handshake.
The first half is reachable by a hub; the second is not, from any hub, by any
means. A hub would have to hold a user's WebUI session token to deliver an
install -- which is not something a hub should ever hold.

**What it costs us.** "Install to agent" cannot work. The button falls back to
a copy-paste CLI command, which requires a terminal on the machine running the
agent and bypasses the `deliver_install` audit trail.

**Suggested upstream fix.** Either an `/install` page in the WebUI that reads
the params, requires the existing session, confirms, and POSTs to the endpoint
that already exists (preferred -- auth and consent both come free); or a second
HMAC-authenticated mount beside `IRONHUB_REGISTER_PATH` so the hub delivers
server-side. Full write-up in `kent-notes/ironclaw-proposal-install-deeplink.md`.

**Remove when fixed.** The workaround is not built yet -- `useInstallIntent`
still opens the dead deep link. When the CLI-command fallback lands, list its
symbols here. Already load-bearing today:

- `buildInstallRedirectUrl`'s `#` (`lib/agent-installations/service.ts`).
  Option A wants `{agentUrl}/install?...`, not a fragment; option B drops the
  browser hop entirely and the whole function with it.

---

## End-to-end verification procedure

Tasks 12.1 and 12.2 of `fix-private-catalog-ironclaw-contract` are unticked
because issue 1 made them impossible with the agent as configured, not because
they were skipped. The DNS-override workaround in issue 1 runs them on a stock
agent today; this is also the procedure to run the day the fix lands. Do not substitute a mocked agent
for it: everything a mock could check is already covered by the unit suites, and
what these two tasks are for is the part no hub-side test can see -- the agent's
own origin, egress, digest, and asset-set enforcement.

**Preconditions**

1. An IronHub deployment reachable over https on a host with a dot, not an IP,
   not an internal suffix. Set `NEXT_PUBLIC_APP_URL` to exactly that origin.
2. An IronClaw agent whose `IRONHUB_MANIFEST_URL` is that same origin. Before
   the fix lands, reach this via the DNS override in issue 1 rather than a
   patched binary -- a patched agent cannot verify the enforcement these two
   tasks exist to check.
3. A registered, verified agent installation in the hub (`/account`), so an
   install intent can be signed.

**12.1 -- a private manifest v3 tool installs**

1. Upload an extension bundle whose `manifest.toml` declares at least three
   capabilities with distinct `input_schema_ref`s, at least one
   `output_schema_ref`, and at least two `prompt_doc_ref`s. It must carry no
   `*.capabilities.json`, so the stub path is exercised.
2. Confirm the artifact screen's "Installable by an agent" check passes.
3. Start the install and approve it in the agent inside the stated window.
4. Confirm in the agent that the extension is installed and every capability
   resolves its schema.
5. Verify from the agent's logs that: the manifest was fetched from the hub
   origin; every artifact was fetched from the hub origin with no redirect;
   the recomputed artifact digest matched the delivered one; and no
   asset-set-equality error was raised.
6. Negative control: delete one stored schema asset and confirm the install
   action is refused hub-side, naming the path, rather than failing in the
   agent.

**12.2 -- a private skill still installs after the redirect change**

1. Upload a private skill with a `SKILL.md` under 1 MB and no bundled files.
2. Start the install and approve it.
3. Confirm the `skill_md` artifact was answered `200` with the bytes, that no
   object-storage host appears anywhere in the agent's egress log, and that the
   skill digest matched.

**Then** tick 12.1 and 12.2 in
`openspec/changes/fix-private-catalog-ironclaw-contract/tasks.md` and record the
agent version the run was made against, since every constant this hub pins is
an agent-side constant.
