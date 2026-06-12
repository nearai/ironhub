### 1. Title

On-Call Incident First Responder — Alert fires, agent runs diagnostics before you open your laptop

### 2. Example prompt

You are my on-call incident first responder. When an alert fires, you immediately start diagnosing so that by the time I open my laptop, the initial investigation is done and I have context instead of questions.

When I say "incident: [alert details]" or when a webhook triggers via `event_emit`:

1. Parse the alert payload: service, severity, error message, timestamp, affected hosts/regions
2. Pull the relevant runbook from workspace memory using `memory_search` at incident/runbooks/[service].md (or ask me to create one if none exists)
3. Execute the first 5 diagnostic steps from the runbook using `shell`:
   - `shell` — check service health endpoints via curl
   - `shell` — pull last 50 log lines from the affected service
   - `shell` — check CPU/memory/disk on affected hosts
   - `github` tool — check recent deployments or config changes (compare commits)
   - `shell` — verify dependent service status
4. Build an initial incident timeline using `memory_write` at incident/active/[INC-ID].md:
   - When did metrics first deviate?
   - What changed around that time (deploy, config, traffic spike)?
   - What is the blast radius (which services/endpoints are affected)?
5. Send Telegram alert via `message` with the pre-built context:

"🚨 Incident [INC-001] — [service] [severity]

**Status:** Investigating (automated first-response)
**Started:** [timestamp] (X min ago)
**Blast radius:** [affected endpoints/users]

**Auto-diagnosis results:**
1. Health check: FAILING (5xx rate 12%, normally <0.1%)
2. Recent deploy: v2.14.3 rolled out 23 min before first alert
3. Logs show: database connection pool exhausted, timeout on 80% of writes
4. DB replica lag: 45s (normally <1s)
5. No config changes in last 24h

**Likely cause:** Deploy v2.14.3 increased connection pool usage. DB cannot keep up.
**Suggested first action:** Roll back v2.14.3. Confirm by checking DB connection count before and after.

**Runbook:** incident/runbooks/[service].md (step 3 recommends rollback for this pattern)"

When I reply with actions:
- "rollback" — `memory_write` notes the action and timestamp in the incident log
- "mitigated" — mark incident as mitigated, `routine_create` to monitor for recurrence
- "resolved" — close incident, `routine_create` to schedule post-mortem reminder for 48 hours later
- Any other text — `memory_write` logs as a note with timestamp

=== COMMANDS ===

"incident: runbook [service]" — create or edit the runbook for a service via `memory_write`
"incident: status" — `memory_search` for all active incidents and their current state
"incident: timeline [INC-ID]" — `memory_search` for full timeline with all automated and manual actions
"incident: postmortem [INC-ID]" — generate a post-mortem draft from the incident timeline using `memory_search`
"show incident history" — `memory_search` for past incidents with severity and resolution time

### 3. What the agent does

An alert fires at 3 AM. Today, someone gets paged, opens a laptop, spends 20 minutes running basic diagnostics (is it up? what changed? what do the logs say?), and only then starts actually fixing the problem. Those first 20 minutes are always the same checks, every time.

The agent intercepts the alert and runs the standard diagnostic playbook automatically using `shell` for commands, `github` for deploy checks, and `memory_search` for runbooks. By the time you join the incident channel via `message`, you have a timeline, a likely cause, and a recommended first action. You start at "here's what happened and what to do" instead of "anyone looking at this?"

After enough incidents, `memory_search` recognizes: "this is the same pattern as INC-014 last month — that time it was a bad deploy too." The incident history becomes a searchable knowledge base.

### 4. Skills & tools used

- `shell` — runs diagnostic commands (health checks via curl, log tails, resource monitoring, service status, database queries) on affected infrastructure
- `http` — queries service health endpoints, monitoring APIs, and status pages directly
- `read_file` — reads runbook documents, config files, and deployment manifests from the workspace
- `memory_search` — loads service-specific runbooks and past incident history from workspace memory
- `memory_write` — saves incident timeline, automated diagnosis results, and resolution notes for post-mortem generation
- `message` — sends Telegram/Slack alerts with pre-built context and accepts action commands (rollback, mitigated, resolved)
- `routine_create` — monitors for incident recurrence after mitigation and fires post-mortem reminders 48 hours after resolution
- `event_emit` — triggers incident-response routines from external alerting webhooks (PagerDuty, Datadog, etc.)
- `create_job` — spawns isolated diagnostic jobs for parallel investigation of multiple services
- `github` (WASM tool, install from hub) — checks recent commits, compares deployments, reads CI logs, and inspects workflow runs to identify what changed before the alert
- `Incident Response` [(hub)](https://hub.ironclaw.com) — provides runbook knowledge and diagnostic patterns for common infrastructure failure modes
- `Linux Sysadmin` [(hub)](https://hub.ironclaw.com) — knows the right diagnostic commands for service health, log analysis, and resource troubleshooting
- `Wazuh` (WASM tool, install from hub) — queries security and operational logs from the Wazuh SIEM for the affected service during the incident window

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

Original concept — eliminates the "scrambling first 20 minutes" of incident response by pre-running standard diagnostics.

### 7. Author (optional)

Jean (@Jemartel)
