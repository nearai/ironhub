### 1. Title

Personal CRM that nudges you when you forget to follow up

### 2. Example prompt

I want to track people I meet and get nudged when I haven't followed up.
Save these contacts to memory under crm/<name>:

1. Alex — met June 7, building a NEAR wallet, wants intro to the grants team. Follow-up: make the intro. Status: pending.
2. Sarah — met June 5, VC interested in AI agents, said she'd review our deck. Follow-up: check if she reviewed it. Status: pending.
3. Mike — met June 1, potential partnership with NEAR Legion, waiting for my proposal. Follow-up: send the proposal. Status: pending.

Then set up a daily routine called personal-crm-nudge with this exact goal:
"Read all contacts from memory under crm/, find ones with status=pending that were met more than 3 days ago. For each one send a Telegram nudge via message tool: name, when you met them, what the follow-up is, and how many days have passed. Stay completely silent if no one needs a nudge."
Schedule: every day at 10:00 AM UTC (cron: 0 10 * * *)

<img width="497" height="471" alt="Image" src="https://github.com/user-attachments/assets/862596a9-8ba9-4e43-a10f-c9f7b231df44" />

### 3. What the agent does

The agent saves each contact to persistent memory with their name, when you met, the context, and what follow-up is needed. You can add new people anytime just by telling it in plain language.

A daily routine runs every morning automatically: it reads your full contact list, finds anyone with a pending follow-up who you met more than 3 days ago, and sends you a Telegram nudge for each one — their name, when you met, what you need to do, and how many days have passed. If everyone is either done or too recent, it stays silent.

Over time it becomes a memory for your whole network. You never lose track of a promising connection again just because life got busy.

<img width="481" height="365" alt="Image" src="https://github.com/user-attachments/assets/ec71af31-ab02-421b-b6ff-ceea078fd70b" />

### 4. Skills & tools used

- `memory_write` / `memory_read` (built-in) — saves each contact (name, date met, context, follow-up, status) and reads them back for the daily check → https://docs.ironclaw.com/capabilities/memory/memory
- `time` (built-in) — checks today's date and calculates days since each meeting
- `message` / Telegram channel (built-in) — sends the follow-up nudge → https://docs.ironclaw.com/channels
- Routines / cron (built-in) — runs the daily check automatically, no manual trigger needed → https://docs.ironclaw.com/capabilities/routines/cron

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
