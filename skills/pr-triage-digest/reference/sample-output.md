# Sample output

Generated 2026-06-16 against the real `nearai/ironhub` + `nearai/ironclaw` repos using an authed GitHub token.

```md
**TL;DR** 164 open PRs across nearai/ironhub + nearai/ironclaw · 60 blockers · 20 quick wins · 20 first-time contributors · 9 aging · 55 normal.

### 🚨 Blockers
- nearai/ironclaw#4943 · feat(reborn): auto-wire Google OAuth in run-reborn-webui.sh · @thisisjoshford · <1d · ❌ CI · +43/-0 · no-reviews
- nearai/ironclaw#3705 · chore(deps): bump rand from 0.8.5 to 0.8.6 in /channels-src… · @dependabot[bot] · 4w · ❌ CI · +2/-2 · no-reviews
- nearai/ironclaw#4498 · build(deps): bump serde_yml from 0.0.12 to 0.0.13 in the se… · @dependabot[bot] · 2w · ❌ CI · +32/-34 · no-reviews
- nearai/ironclaw#4691 · feat(cli): add config validate for blueprints · @loopstring · 6d · ❌ CI · +282/-0 · no-reviews
- nearai/ironclaw#4905 · [codex] Gate operator logs in WebUI v2 · @krishna-505 · 1d · ❌ CI · +64/-19 · no-reviews
- nearai/ironclaw#3942 · refactor(trace): PilotAllowlist enum + caller-level error-b… · @zmanian · 3w · ✅ CI · +160/-74 · no-reviews
- nearai/ironclaw#4567 · [hooks] Record hook quarantine in durable audit · @zmanian · 1w · ✅ CI · +370/-36 · no-reviews
- nearai/ironclaw#4641 · fix(extensions/gsuite): default calendar list_events to upc… · @BenKurrek · 1w · ❌ CI · +91/-2 · no-reviews
- nearai/ironclaw#4975 · reborn(learning) WS-3: lightweight reflection service · @serrrfirat · <1d · ❌ CI · +726/-5 · no-reviews
- nearai/ironclaw#3584 · fix(mission): route outcome notifications to originating ch… · @italic-jinxin · 5w · ❌ CI · +1419/-28 · no-reviews
- nearai/ironclaw#4941 · feat(tools): add Slack personal (user-token) tool · @sergeiest · <1d · ❌ CI · +732/-0 · no-reviews
- nearai/ironclaw#3708 · chore: release · @ironclaw-ci[bot] · 4w · ❌ CI · +92/-30 · no-reviews
- nearai/ironclaw#4906 · test: live-tier + multi-gate sequence coverage for resume-o… · @henrypark133 · 1d · ✅ CI · +1224/-18 · no-reviews
- nearai/ironclaw#4584 · refactor(host_api): centralize system-sentinel id minting a… · @matiasbenary · 1w · ❌ CI · +303/-21 · changes-requested
- nearai/ironclaw#4777 · [codex] Persist Slack connected state in WebUI · @serrrfirat · 5d · ✅ CI · +1162/-201 · no-reviews
- nearai/ironclaw#4765 · [codex] Fix subagent inline prompt body budget · @serrrfirat · 5d · ✅ CI · +164/-75 · no-reviews
- nearai/ironclaw#4756 · fix(triggers): surface validation errors and clarify trigge… · @henrypark133 · 5d · ✅ CI · +438/-29 · no-reviews
- nearai/ironclaw#4583 · feat(llm): NormalizingProvider Layer-3 decorator (RC3/M9 Ph… · @henrypark133 · 1w · ❌ CI · +519/-4 · approved-once
- nearai/ironclaw#4653 · feat(cli): non-interactive tool setup with --secret flag · @Kampouse · 1w · ❌ CI · +230/-8 · no-reviews
- nearai/ironclaw#4298 · feat: upgrade MiniMax default model to M3 · @octo-patch · 2w · ❌ CI · +7/-6 · no-reviews
- nearai/ironclaw#3890 · [codex] Add Reborn multi-tenant isolation contract tests · @serrrfirat · 4w · ❌ CI · +987/-15 · changes-requested
- nearai/ironclaw#4787 · [NO MERGE] - Barcelona Hackathon · @elliotBraem · 4d · ❌ CI · +45869/-177 · 323 files · no-reviews
- nearai/ironclaw#4978 · Fix Reborn WebUI approval-deny activity ordering · @hanakannzashi · <1d · ❌ CI · +3012/-211 · 62 files · no-reviews
- nearai/ironclaw#4841 · reborn: no run-borking failures — failure explanation + ret… · @serrrfirat · 3d · ✅ CI · +6825/-566 · 112 files · no-reviews
- nearai/ironclaw#4876 · build(deps): bump the everything-else group across 1 direct… · @dependabot[bot] · 1d · ❌ CI · +1390/-645 · 41 files · no-reviews
- nearai/ironclaw#3952 · feat(filesystem): TOCTOU-harden LocalFilesystem via fd-rela… · @zmanian · 3w · ❌ CI · +1645/-617 · no-reviews
- nearai/ironclaw#4650 · fix(llm): drop temperature for models that reject it (Opus … · @abbyshekit · 1w · ✅ CI · +325/-10 · changes-requested
- nearai/ironclaw#4501 · ci: avoid runtime tests for dependabot config updates · @serrrfirat · 2w · ✅ CI · +125/-42 · no-reviews
- nearai/ironclaw#4648 · feat(mcp): thread-scoped sessions + SEP-414 context propaga… · @kirikov · 1w · ❌ CI · +1391/-135 · no-reviews
- nearai/ironclaw#4379 · feat: migrate read-only commands `doctor`, `status` and `co… · @denbite · 2w · ✅ CI · +1594/-36 · no-reviews
- nearai/ironclaw#4128 · Enable extension lifecycle tools for production profiles · @serrrfirat · 3w · ✅ CI · +368/-97 · no-reviews
- nearai/ironclaw#4022 · fix(tools): HTTP response error is recoverable, not a run-a… · @zmanian · 3w · ✅ CI · +91/-56 · no-reviews
- nearai/ironclaw#4080 · chore: update WASM artifact checksums and version-pinned UR… · @github-actions[bot] · 3w · ✅ CI · +10/-5 · no-reviews
- nearai/ironclaw#3976 · fix(slack): support file attachments in inbound messages · @sergeiest · 3w · ❌ CI · +72/-87 · no-reviews
- nearai/ironclaw#3707 · chore(deps): bump jsonwebtoken from 9.3.1 to 10.3.0 · @dependabot[bot] · 4w · ❌ CI · +7/-6 · no-reviews
- nearai/ironclaw#4712 · Move Slack setup into WebUI · @serrrfirat · 6d · ✅ CI · +2853/-1258 · no-reviews
- nearai/ironclaw#4661 · feat(extensions): read-only NEAR mainnet first-party extens… · @abbyshekit · 6d · ✅ CI · +1847/-1 · changes-requested
- nearai/ironclaw#4284 · feat: adds NEAR SSO to WebChat V2 · @italic-jinxin · 2w · ✅ CI · +1907/-72 · no-reviews
- nearai/ironclaw#3949 · [codex] Refine host runtime crate boundaries · @serrrfirat · 3w · ✅ CI · +34/-147 · no-reviews
- nearai/ironclaw#3885 · feat(product-workflow): add read-path guard and command rou… · @danielwpz · 4w · ✅ CI · +193/-56 · changes-requested
- nearai/ironclaw#3860 · Freeze tool package readiness contract (Lane 2) · @nickpismenkov · 4w · ✅ CI · +628/-90 · no-reviews
- nearai/ironclaw#3775 · feat(reborn): add memory product surface contracts · @hanakannzashi · 4w · ✅ CI · +1968/-4 · no-reviews
- nearai/ironclaw#3926 · Harden NoExposureGuard composition and audit coverage · @serrrfirat · 3w · ❌ CI · +256/-76 · no-reviews
- nearai/ironclaw#4492 · [codex] fix configured extension credential staging · @serrrfirat · 2w · ✅ CI · +4820/-3446 · 36 files · changes-requested
- nearai/ironclaw#4662 · docs(reborn): project-scoped ownership plan + contract revi… · @henrypark133 · 6d · ✅ CI · +2677/-1333 · changes-requested
- nearai/ironclaw#4239 · feat(reborn): project product-auth accounts into runtime cr… · @serrrfirat · 3w · ✅ CI · +5536/-503 · 33 files · no-reviews
- nearai/ironclaw#3767 · Add lean host NoExposureGuard service · @serrrfirat · 4w · ✅ CI · +797/-50 · changes-requested
- nearai/ironclaw#3766 · fix: (auth) Seal dispatch authority with AuthorizedDispatch… · @serrrfirat · 4w · ✅ CI · +991/-397 · 37 files · no-reviews
- nearai/ironclaw#4671 · feat(reborn): extra-capabilities seam — register host-suppl… · @pranavraja99 · 6d · ❌ CI · +515/-14 · no-reviews
- nearai/ironclaw#4550 · Support full SHA GitHub branch creation · @serrrfirat · 1w · ❌ CI · +98/-30 · no-reviews
- nearai/ironclaw#1378 · feat(routing): per-channel MCP and built-in tool filtering · @nick-stebbings · 3mo · ✅ CI · +2120/-61 · changes-requested
- nearai/ironclaw#3960 · feat(signing): SigningProvider trait crate + plan doc (atte… · @zmanian · 3w · ✅ CI · +3578/-46 · changes-requested
- nearai/ironclaw#3590 · feat(reborn): Telegram v2 inbound tracer (webhook → ledger … · @nickpismenkov · 5w · ✅ CI · +5236/-1613 · 46 files · changes-requested
- nearai/ironclaw#4685 · feat(blueprint): add ironclaw.config/v1 parser · @loopstring · 6d · ❌ CI · +1806/-1 · changes-requested
- nearai/ironclaw#4663 · feat(reborn): project-scoped automation ownership core model · @henrypark133 · 6d · ❌ CI · +5654/-841 · 40 files · no-reviews
- nearai/ironclaw#4544 · Add scoped lifecycle admin foundation for Reborn capabiliti… · @serrrfirat · 1w · ❌ CI · +3337/-17 · no-reviews
- nearai/ironclaw#4145 · [codex] Anchor Reborn turn objective in loop context · @serrrfirat · 3w · ❌ CI · +405/-8 · changes-requested
- nearai/ironclaw#2066 · feat(slack): fetch thread history when bot is mentioned in … · @synner88 · 2mo · ❌ CI · +317/-24 · no-reviews
- nearai/ironclaw#4479 · feat(reborn-ironhub) port IronHub install flow to Reborn · @serrrfirat · 2w · ❌ CI · +2853/-21 · no-reviews
- nearai/ironclaw#3703 · arch(reborn): futureproof RebornRuntime surface for epic #3… · @serrrfirat · 4w · ❌ CI · +2124/-182 · no-reviews

### ⚡ Quick wins
- nearai/ironclaw#4968 · [codex] fix gsuite refresh auth classification · @serrrfirat · <1d · ✅ CI · +16/-5 · approved-once
- nearai/ironclaw#4979 · fix(reborn): sidebar new conversation button style · @think-in-universe · <1d · ✅ CI · +12/-2 · approved-once
- nearai/ironclaw#4924 · refactor(webui): replace Logs/Docs icons with text labels · @danielwpz · 1d · ✅ CI · +4/-29 · no-reviews
- nearai/ironclaw#4930 · test(setup): clear DATABASE_URL after wizard reloads .env i… · @standardtoaster · 1d · ✅ CI · +8/-2 · no-reviews
- nearai/ironclaw#4911 · fix(auth-resume): keep prior approval metadata atomic · @serrrfirat · 1d · ✅ CI · +22/-5 · no-reviews
- nearai/ironclaw#4575 ·  Fix system ResourceScope JSON round-trip · @matiasbenary · 1w · ✅ CI · +53/-3 · approved-once
- nearai/ironclaw#3511 · fix(prompt): avoid repeated compact tool schema lookups · @hanakannzashi · 5w · ✅ CI · +23/-8 · no-reviews
- nearai/ironclaw#4990 · [codex] Fix NEAR AI MCP ready state projection · @think-in-universe · <1d · ✅ CI · +107/-6 · no-reviews
- nearai/ironclaw#4971 · [codex] Clarify trigger active state output · @serrrfirat · <1d · ✅ CI · +48/-12 · no-reviews
- nearai/ironclaw#4970 · fix(reborn): record Delivered (not Skipped) for non-OAuth a… · @serrrfirat · <1d · ✅ CI · +39/-29 · no-reviews
- nearai/ironclaw#4927 · fix(reborn): allow credential-free hosted MCP providers to … · @standardtoaster · 1d · ✅ CI · +117/-5 · no-reviews
- nearai/ironclaw#4830 · ci: run Reborn E2E in the merge queue with internal scope g… · @serrrfirat · 3d · ✅ CI · +78/-10 · no-reviews
- nearai/ironclaw#4411 · chore: update WASM artifact checksums and version-pinned UR… · @github-actions[bot] · 2w · ✅ CI · +4/-4 · no-reviews
- nearai/ironclaw#2957 · fix(mcp): skip OAuth discovery for stdio/unix transports (#… · @rajulbhatnagar · 7w · ✅ CI · +59/-0 · no-reviews
- nearai/ironclaw#3834 · test: canary for /benchmark dispatcher (will close, do not … · @pranavraja99 · 4w · ✅ CI · +0/-0 · no-reviews
- nearai/ironclaw#2457 · fix(oidc): make audience claim optional for OIDC-proxying l… · @synner88 · 2mo · ✅ CI · +12/-7 · no-reviews
- nearai/ironclaw#2960 · fix(mcp): skip OAuth discovery for stdio/unix transports (f… · @willamhou · 7w · ✅ CI · +61/-0 · no-reviews
- nearai/ironclaw#4090 · chore: allow configuring log truncation size with `IRONCLAW… · @denbite · 3w · ✅ CI · +49/-2 · no-reviews
- nearai/ironclaw#3758 · [codex] Disable ANSI colors in worker containers · @serrrfirat · 4w · ✅ CI · +135/-5 · no-reviews
- nearai/ironclaw#3512 · fix(web-ui): failed tool card history rendering · @hanakannzashi · 5w · ✅ CI · +181/-5 · no-reviews

### 👋 First contributors
- nearai/ironclaw#4934 · build(deps-dev): bump js-yaml from 4.1.1 to 4.2.0 in /docs/… · @dependabot[bot] · 1d · ✅ CI · +14/-3 · no-reviews
- nearai/ironclaw#4499 · build(deps): bump the tokio-ecosystem group across 1 direct… · @dependabot[bot] · 2w · ✅ CI · +40/-70 · no-reviews
- nearai/ironclaw#4032 · build(deps): bump the wasm group across 1 directory with 2 … · @dependabot[bot] · 3w · ✅ CI · +61/-61 · no-reviews
- nearai/ironclaw#4521 · Add JSON cleaner for formatting and sanitization · @Dannye013 · 1w · ✅ CI · +40/-0 · changes-requested
- nearai/ironclaw#4649 · fix(embeddings): honor config precedence, validate provider… · @abbyshekit · 1w · ✅ CI · +399/-23 · approved-once
- nearai/ironclaw#4955 · fix(reborn): correlate run logs with thread_id/run_id for o… · @loopstring · <1d · ✅ CI · +416/-49 · changes-requested
- nearai/ironclaw#4002 · build(deps): bump the actions group across 1 directory with… · @dependabot[bot] · 3w · ✅ CI · +134/-134 · no-reviews
- nearai/ironclaw#4264 · feat(gateway): add routine create endpoint · @wcc945 · 2w · ✅ CI · +291/-5 · no-reviews
- nearai/ironclaw#4689 · feat(harness): add ironclaw.harness/v1 manifest parser · @loopstring · 6d · ✅ CI · +480/-1 · no-reviews
- nearai/ironclaw#4040 · feat: Add dictionary-skill v0.1.0 · @aryandudhagaralearning · 3w · ✅ CI · +29/-0 · no-reviews
- nearai/ironclaw#4038 · feat(skills): YouTube Video Summarizer — transform any vide… · @radhe01q-star · 3w · ✅ CI · +37/-0 · no-reviews
- nearai/ironclaw#3975 · fix(channels): Updates the Discord channel config parser to… · @GenesisX · 3w · ✅ CI · +38/-1 · no-reviews
- nearai/ironclaw#4735 · feat(extensions): programmatic MCP server config + PATCH up… · @kirikov · 6d · ✅ CI · +901/-26 · no-reviews
- nearai/ironclaw#4687 · feat(blueprint): add apply engine · @loopstring · 6d · ✅ CI · +655/-1 · no-reviews
- nearai/ironclaw#3549 · fix: upgrade base images to debian trixie, pin image and ad… · @umglurf · 5w · ✅ CI · +28/-12 · no-reviews
- nearai/ironclaw#4039 · feat(skill): add news-summarizer skill v0.1.0 · @dd9825817844-max · 3w · ✅ CI · +120/-0 · no-reviews
- nearai/ironclaw#3892 · Add near ecosystem summary skill · @imrohitom · 4w · ✅ CI · +106/-0 · no-reviews
- nearai/ironclaw#3853 · Add Web Summarizer Skill by ridham · @righamgadhesriya · 4w · ✅ CI · +76/-0 · no-reviews
- nearai/ironclaw#3256 · feat(wasm): credential signers for HMAC, EIP-712, NEP-413, … · @neo-sky · 6w · ✅ CI · +5768/-146 · approved-once
- nearai/ironclaw#3737 · feat(ironhub): install tools and skills from IronHub (CLI, … · @neo-sky · 4w · ✅ CI · +8285/-32 · 45 files · changes-requested

### 🕰 Aging
- nearai/ironclaw#3966 · feat(signing): turns BlockedAttested gate + AttestedResumeP… · @zmanian · 3w (idle 3w) · ✅ CI · +1678/-68 · approved-once
- nearai/ironclaw#3676 · docs: rework the security section — secrets, sandboxing, le… · @thisisjoshford · 5w (idle 4w) · ✅ CI · +370/-107 · no-reviews
- nearai/ironclaw#3974 · feat(signing): injected wallet provider + gate/resolve wiri… · @zmanian · 3w (idle 3w) · ✅ CI · +2246/-10 · approved-once
- nearai/ironclaw#3994 · feat(signing): ironclaw_attested_runtime — reborn AttestedR… · @zmanian · 3w (idle 3w) · ✅ CI · +12528/-47 · 56 files · approved-once
- nearai/ironclaw#4104 · feat(signing): grant expiry + binding tenant-key + retryabl… · @zmanian · 3w (idle 3w) · ✅ CI · +638/-180 · no-reviews
- nearai/ironclaw#3992 · feat(signing): WalletConnect v2 backend (attested-signing P… · @zmanian · 3w (idle 3w) · ✅ CI · +2586/-24 · approved-once
- nearai/ironclaw#3993 · feat(signing): NEAR redirect provider + outbound delivery w… · @zmanian · 3w (idle 3w) · ✅ CI · +2207/-12 · approved-once
- nearai/ironclaw#3964 · feat(signing): durable one-shot challenge store + WebAuthn … · @zmanian · 3w (idle 3w) · ✅ CI · +3839/-17 · approved-once
- nearai/ironclaw#4083 · docs(extensions): use snake_case IDs in install/auth comman… · @matiasbenary · 3w (idle 3w) · ✅ CI · +27/-27 · no-reviews

### 📋 Normal
- nearai/ironclaw#3947 · [codex] Add Reborn event and scheduling parity coverage · @serrrfirat · 3w · ✅ CI · +415/-1 · no-reviews
- nearai/ironclaw#4989 · Persist Engine V2 LLM usage · @think-in-universe · <1d · ✅ CI · +408/-26 · no-reviews
- nearai/ironclaw#4821 · ci(test): shard ironclaw_webui_v2 Reborn tests · @think-in-universe · 4d · ✅ CI · +259/-11 · no-reviews
- nearai/ironclaw#4969 · [codex] fix google wasm auth required errors · @serrrfirat · <1d · ✅ CI · +121/-26 · no-reviews
- nearai/ironclaw#4859 · feat(reborn): complete operator setup state · @think-in-universe · 2d · ✅ CI · +329/-64 · no-reviews
- nearai/ironclaw#4561 · fix(hooks): record MCP direct-lease denials in SecurityAudi… · @zmanian · 1w · ✅ CI · +89/-42 · no-reviews
- nearai/ironclaw#4058 · feat(signing): KMS curve-capability fail-closed on the cust… · @zmanian · 3w · ✅ CI · +586/-23 · approved-once
- nearai/ironclaw#3940 · test(arch): assert production composition populates securit… · @zmanian · 3w · ✅ CI · +283/-0 · no-reviews
- nearai/ironclaw#4993 · fix(agent-loop): no-progress stop fails honestly instead of… · @serrrfirat · <1d · ⏳ CI · +101/-85 · no-reviews
- nearai/ironclaw#4953 · fix(reborn): gate triggered Slack OAuth URL on a verified p… · @henrypark133 · <1d · ✅ CI · +1469/-98 · no-reviews
- nearai/ironclaw#4984 · fix(reborn): fix failed tool activity updates in WebUI · @think-in-universe · <1d · ✅ CI · +580/-40 · no-reviews
- nearai/ironclaw#4976 · [codex] Improve binary HTTP and PDF read_file harness paths · @serrrfirat · <1d · ✅ CI · +203/-32 · no-reviews
- nearai/ironclaw#4858 · fix(reborn): show sanitized command details · @think-in-universe · 2d · ✅ CI · +1689/-144 · no-reviews
- nearai/ironclaw#4860 · feat(reborn): wire local service lifecycle backend · @think-in-universe · 2d · ✅ CI · +1327/-7 · no-reviews
- nearai/ironclaw#4967 · [codex] Recover invalid model output in loop · @serrrfirat · <1d · ✅ CI · +690/-46 · no-reviews
- nearai/ironclaw#4801 · feat(reborn): wire Reborn operator diagnostics · @think-in-universe · 4d · ✅ CI · +617/-16 · no-reviews
- nearai/ironclaw#4820 · ci(test): shard legacy all-features tests · @think-in-universe · 4d · ✅ CI · +576/-15 · no-reviews
- nearai/ironclaw#4804 · feat(reborn): support Reborn operator log tail/follow · @think-in-universe · 4d · ✅ CI · +538/-45 · no-reviews
- nearai/ironclaw#4902 · feat(openai-compat): vision support for inline images (#464… · @ilblackdragon · 1d · ✅ CI · +951/-117 · no-reviews
- nearai/ironclaw#4937 · reborn(learning): WS-1 — memory learning semantics + A/B ga… · @serrrfirat · <1d · ✅ CI · +1104/-28 · no-reviews
- nearai/ironclaw#4938 · reborn(learning): WS-2 — learning persona + /learn surface … · @serrrfirat · <1d · ✅ CI · +1481/-27 · no-reviews
- nearai/ironclaw#4785 · docs(plans): Reborn persistent tenant sandbox & agent-built… · @serrrfirat · 4d · ✅ CI · +987/-0 · no-reviews
- nearai/ironclaw#4565 · [hooks] Record credential-boundary egress blocks · @zmanian · 1w · ✅ CI · +411/-63 · changes-requested
- nearai/ironclaw#4563 · [hooks] Record no-exposure egress blocks · @zmanian · 1w · ✅ CI · +287/-19 · changes-requested
- nearai/ironclaw#2341 · fix(tools): bound file history memory, add job cleanup, uni… · @zmanian · 2mo · ✅ CI · +794/-130 · no-reviews
- nearai/ironclaw#4829 · ci: retire dormant reborn-integration workflow, add Reborn … · @serrrfirat · 3d · ✅ CI · +23/-203 · no-reviews
- nearai/ironclaw#4728 · [codex] Allow Reborn secure production without process back… · @serrrfirat · 6d · ✅ CI · +347/-11 · no-reviews
- nearai/ironclaw#4518 · [codex] Add Reborn extension lifecycle e2e coverage · @serrrfirat · 1w · ⏳ CI · +1570/-16 · no-reviews
- nearai/ironclaw#4994 · reborn(learning) WS-4: reflection never-repeat E2E + accept… · @serrrfirat · <1d · ⏳ CI · +644/-2 · no-reviews
- nearai/ironclaw#4678 · Scrub provider reasoning metadata · @henrypark133 · 6d · ✅ CI · +501/-87 · changes-requested
- nearai/ironclaw#4265 · test: implement live E2E tests following codeact preamble g… · @denbite · 2w · ✅ CI · +678/-0 · no-reviews
- nearai/ironclaw#4021 · test(tools): CI boundary test ratcheting tool execution thr… · @zmanian · 3w · ✅ CI · +513/-0 · no-reviews
- nearai/ironclaw#3772 · docs(audit): crate boundary & ownership audit (reborn-integ… · @nickpismenkov · 4w · ✅ CI · +609/-0 · no-reviews
- nearai/ironclaw#4026 · feat(tools): route engine-v2 effect bridge through the audi… · @zmanian · 3w · ✅ CI · +605/-35 · no-reviews
- nearai/ironclaw#4025 · feat(tools): route bridge/command tool execution through th… · @zmanian · 3w · ✅ CI · +508/-55 · no-reviews
- nearai/ironclaw#4024 · feat(tools): route scheduler + routine-engine tool executio… · @zmanian · 3w · ✅ CI · +626/-111 · no-reviews
- nearai/ironclaw#4060 · fix(signing): continuation asserts caller scope/run/gate_re… · @zmanian · 3w · ✅ CI · +476/-13 · changes-requested
- nearai/ironclaw#4023 · feat(tools): route chat tool execution through the audited … · @zmanian · 3w · ✅ CI · +613/-59 · no-reviews
- nearai/ironclaw#4067 · fix(signing): fail-closed wire encoding for attestation can… · @zmanian · 3w · ✅ CI · +622/-121 · no-reviews
- nearai/ironclaw#4315 · Fix engine v2 vision attachments · @hanakannzashi · 2w · ✅ CI · +1405/-139 · no-reviews
- nearai/ironclaw#3669 · engine v2: expose channel-supplied thread/response ids to t… · @zetyquickly · 5w · ✅ CI · +880/-23 · no-reviews
- nearai/ironclaw#3548 · Add DISABLE_TOOLS_LIST flag and security regression test · @zetyquickly · 5w · ✅ CI · +516/-9 · no-reviews
- nearai/ironclaw#4954 · fix(reborn): surface approval-gate denial to model instead … · @henrypark133 · <1d · — CI · +0/-0 · no-reviews
- nearai/ironclaw#4664 · refactor(reborn): project vocabulary on the product surface · @henrypark133 · 6d · ✅ CI · +2169/-146 · changes-requested
- nearai/ironclaw#4656 · feat(reborn): WU-C2 durable gate resolution store + capacit… · @henrypark133 · 6d · ✅ CI · +5309/-1 · changes-requested
- nearai/ironclaw#4304 · [codex] plan runtime context prompt stage · @henrypark133 · 2w · ✅ CI · +1256/-0 · changes-requested
- nearai/ironclaw#4178 · feat: add Feishu websocket event intake · @hanakannzashi · 3w · ✅ CI · +7019/-457 · 35 files · no-reviews
- nearai/ironclaw#4054 · test(signing): multi-tenant operating model + cross-tenant … · @zmanian · 3w · ✅ CI · +694/-13 · changes-requested
- nearai/ironclaw#4015 · feat(signing): request_signature tool + attested gate-model… · @zmanian · 3w · ✅ CI · +1614/-97 · changes-requested
- nearai/ironclaw#4055 · feat(signing): TrustEnrollment ceremony + connected-wallet … · @zmanian · 3w · ✅ CI · +3150/-187 · changes-requested
- nearai/ironclaw#3996 · feat(signing): durable PG+libSQL attested stores + per-chai… · @zmanian · 3w · ✅ CI · +3348/-122 · 36 files · changes-requested
- nearai/ironclaw#3997 · feat(signing): register NEAR/WC providers + flip production… · @zmanian · 3w · ✅ CI · +5118/-135 · changes-requested
- nearai/ironclaw#3995 · feat(signing): reborn webui attested gate/resolve ingress (… · @zmanian · 3w · ✅ CI · +2702/-131 · changes-requested
- nearai/ironclaw#3963 · feat(signing): sealed one-shot grant store + signing ledger… · @zmanian · 3w · ✅ CI · +1939/-122 · changes-requested
- nearai/ironclaw#3965 · feat(signing): ironclaw_chain_signing — custodial multi-cha… · @zmanian · 3w · ✅ CI · +6567/-25 · 32 files · changes-requested

_Auth: token present. Enriched 164/164 PRs. Budget: 4975 remaining._
```
