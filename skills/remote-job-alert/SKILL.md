---
name: remote-job-alert
version: 1.0.0
description: "Checks RemoteOK every few hours for new remote crypto, blockchain, Rust, and web3 jobs and alerts the user on Telegram only about genuinely new matches. It filters listings where the title or at least two tags match the keywords, and dedupes against a memory file of already-seen job URLs so the same job is never sent twice."
activation:
  keywords:
    - "remote job"
    - "job alert"
    - "remoteok"
    - "crypto jobs"
    - "rust jobs"
  patterns:
    - "(?i)(remote\\s+)?job\\s+(alert|watch|monitor)"
    - "(?i)(crypto|rust|web3|blockchain)\\s+jobs"
  tags:
    - "jobs"
    - "crypto"
    - "monitoring"
    - "automation"
  max_context_tokens: 2000
requires:
  tools:
    - http
    - memory
    - message
    - routine
  bins: []
  env: []
---
You watch RemoteOK for new remote crypto/Rust jobs and alert the user only about ones they haven't seen before.

## Hard rules
- Decide whether a job matches by reading its title and tags in plain language. Never write or run code to filter.
- Always read `jobs/seen.md` with `memory_read` before sending, and append new job URLs with `memory_write` after alerting. Never overwrite the file from scratch and never drop earlier URLs. On the first run, if the file does not exist, treat all current matches as already-seen, save their URLs as the baseline, and stop — do not alert on the first run (it would dump the whole board).
- Send an alert only for jobs whose URL is not already in `jobs/seen.md`. If there are no new matches, reply `HEARTBEAT_OK` and stop — send no message.
- Report only jobs you actually fetched. Never invent a listing, a company, or a URL.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Matching
A job matches if its TITLE contains any of: crypto, blockchain, rust, web3, NEAR, DeFi, solidity — OR if at least 2 of its first 5 tags match those keywords. The two-tag rule avoids false positives where an unrelated company happens to carry a single crypto tag.

## Job check (routine)
Create a routine that runs every 6 hours. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Fetch all jobs with the `http` tool: `https://remoteok.com/api`. (The first item is metadata — skip it.)
2. Keep only jobs that match the rule above.
3. For each match, take: title, company, first 5 tags, URL (`https://remoteok.com/remote-jobs/[slug]`), date posted.
4. Read `jobs/seen.md` with `memory_read`. Keep only matches whose URL is NOT already in it.
5. If there are new jobs, send the alert (format below), then append their URLs to `jobs/seen.md` with `memory_write`.
6. If there are no new jobs, reply `HEARTBEAT_OK` and stop.

Alert format:
```
💼 New Remote Jobs
- [title] — [company]
  🏷 [tags]
  🔗 [URL]
- [title] — [company]
  🏷 [tags]
  🔗 [URL]
```
(List every new job, not just one.)

## Commands
- `show remote jobs` — fetch RemoteOK now and show current matching jobs (without changing the seen list)
