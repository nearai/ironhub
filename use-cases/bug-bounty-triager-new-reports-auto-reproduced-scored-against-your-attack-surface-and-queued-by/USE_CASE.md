### 1. Title

Bug Bounty Triager — New reports auto-reproduced, scored against your attack surface, and queued by priority

### 2. Example prompt

You are my bug bounty triager. When a new report comes in, you reproduce it, score it against our actual attack surface, and draft the initial response — so I review a prioritized queue instead of a raw inbox.

When I say "triage: [report ID or paste report]" or when a new HackerOne/Bugcrowd webhook triggers via `event_emit`:

1. Parse the report: vulnerability type, affected endpoint, steps to reproduce, claimed severity
2. `grep` the codebase to check if the endpoint exists in current code (it might be stale or already removed)
3. Attempt to reproduce the vulnerability in a sandboxed environment using `shell`:
   - Set up the minimal conditions described
   - Execute the reproduction steps
   - Capture evidence (HTTP requests, responses, error output)
4. Score severity against actual attack surface using `read_file` on config/auth files:
   - Is this endpoint publicly exposed or internal-only?
   - Does it require authentication? What privilege level?
   - What data is accessible if exploited?
   - Is the exploit reliable or conditional?
5. `memory_write` to save the triage result at bounty/triage/[REPORT-ID].md with full analysis
6. Draft the initial response to the researcher

"🎯 Bug Bounty Triage — [REPORT-ID]

**Claimed:** [XSS on /api/v2/users/profile]
**Reproduced:** ✅ Yes (or ❌ No — reason)
**Actual severity:** High (claimed: Critical)
**Reasoning:** Endpoint requires authenticated user, no admin escalation possible. PII accessible but limited to own profile. Downgraded from Critical because no unauthenticated access.

**Evidence:**
- Request: [curl command]
- Response: [sanitized output]
- Impact: reflected XSS executes in user's own session, no cross-user impact

**Suggested response to researcher:**
'Thank you for the report. We have confirmed the vulnerability. Based on our impact assessment, we are classifying this as High severity. The bounty for High severity findings on our program is [$X].'

**Priority queue position:** 2 of 7 open reports (1 Critical above this)"

=== COMMANDS ===

"triage: queue" — `memory_search` for all open reports sorted by actual severity
"triage: respond [ID] accept/reject/need-info" — `memory_write` to log decision, `gmail` tool to send response
"triage: duplicate [ID1] of [ID2]" — `memory_write` to mark as duplicate and link to original report
"show bounty stats" — `memory_search` for total reports, triage rate, severity distribution
"bounty: out of scope [ID]" — `memory_write` to mark as out of scope with reason, `gmail` to draft rejection

### 3. What the agent does

Bug bounty programs receive 10-100 reports per week. Most are noise: already-known issues, out-of-scope endpoints, unreproducible claims, or informational findings dressed up as Critical. Triaging them takes 2-4 hours per day for a security engineer.

The agent does the mechanical part automatically. It reads the report, verifies the endpoint exists via `grep`, attempts reproduction in a sandbox via `shell`, scores actual impact against the real attack surface, and drafts the response via `gmail`. The human reviews the queue in priority order and makes the final call.

It uses `memory_search` to track duplicate reports and researcher history. Over time: "this researcher has submitted 12 reports, 10 were unreproducible — apply extra scrutiny."

### 4. Skills & tools used

- `shell` — attempts to reproduce the vulnerability in a sandboxed environment, runs curl commands for HTTP-based attacks, executes proof-of-concept exploits safely
- `grep` — searches the codebase for the reported endpoint, function, or vulnerable code path to verify it exists in the current version
- `read_file` — reads auth config, route definitions, and access control files to assess actual attack surface
- `http` — reproduces HTTP-based vulnerabilities (XSS, SSRF, injection) by sending crafted requests to the target endpoint
- `memory_search` — loads triage history, duplicate database, and per-researcher track record from workspace memory
- `memory_write` — saves each triage result with reproduction evidence, severity assessment, and response draft
- `message` — sends priority alerts to the security engineer's connected channel (Telegram, Slack)
- `routine_create` — creates a 30-minute interval routine to check for new reports during business hours
- `create_job` — spawns isolated sandbox jobs for parallel reproduction of multiple reports
- `github` (WASM tool, install from hub) — creates issues from confirmed bugs, links them to the relevant code, and tracks remediation progress
- `gmail` (WASM tool, install from hub) — sends templated responses to researchers and receives new bug bounty report notifications
- `slack` (WASM tool, install from hub) — if the team uses Slack for security channel coordination, posts triage results to the appropriate channel
- `Penetration Testing` [(hub)](https://hub.ironclaw.com) — understands exploit techniques, reproduction methodology, and vulnerability classification (OWASP, CWE)
- `Smart Contract Security` [(hub)](https://hub.ironclaw.com) — handles Web3-specific bug reports (reentrancy, flash loan attacks, oracle manipulation, front-running)
- `Application Security` [(hub)](https://hub.ironclaw.com) — scores actual impact against the application's attack surface, accounting for authentication requirements and data sensitivity
- `Threat Modeling` [(hub)](https://hub.ironclaw.com) — provides structured threat categorization and risk assessment frameworks
- `security-review` (built-in skill) — security audit for code changes: OWASP top 10, auth flows, data handling, secrets exposure
- `code-review` (built-in skill) — traces the vulnerable code path through the application to assess blast radius and exploit chain

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [x] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — bug bounty triage is mechanical, high-volume, and well-suited to automated reproduction and scoring with human final review.

### 7. Author (optional)

Jean (@Jemartel)
