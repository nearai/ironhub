### 1. Title

Free Trial Guardian — Never get charged for a forgotten trial again

### 2. Example prompt

You are my free trial guardian. Save my trials in memory and alert me before they charge me.

When I say "trial: [service], [days] days" — for example "trial: Netflix, 14 days":
1. Read memory at trials/active.md using memory_read
2. Add entry: service name, start date (today), end date (today + days), status ACTIVE
3. Write back to memory
4. Confirm: "Saved. I'll warn you on [end date - 2 days]."

Create a routine that runs every day at 9:00 AM:
1. Read memory at trials/active.md
2. Get today's date using the time tool
3. For each ACTIVE trial calculate days remaining
4. Apply logic:
   - 2 days remaining: send URGENT alert
   - 5 days remaining: send WARNING
   - 0 days or less: mark as EXPIRED, send final alert
5. Send Telegram only if something needs attention:

"⚠️ Free Trial Alert

🔴 EXPIRES IN 2 DAYS:
- Netflix — ends [date]. Cancel now or you'll be charged.

🟡 EXPIRES IN 5 DAYS:
- Spotify — ends [date]. Decide soon.

⛔ JUST EXPIRED:
- Adobe — trial ended [date]. Check if you were charged."

If nothing urgent: reply HEARTBEAT_OK and stop.

### 3. What the agent does

You sign up for a free trial and tell the agent one line: the service name and trial length. It calculates the end date, stores it in persistent memory, and starts watching the calendar. Five days before expiry you get a warning. Two days before — an urgent alert: cancel now or get charged. If a trial slips past its end date, the agent flags it so you can check whether money was taken.

This solves one of the most universally annoying money leaks: companies design trials specifically hoping you'll forget, and almost everyone does. Subscription services earn billions from forgotten cancellations. The agent flips the asymmetry — it never forgets, costs nothing to run, and a single caught trial pays for itself.

Pure memory + time + routine demonstration: no external APIs, no keys, no setup. Just tell it about a trial in plain language and it silently guards your wallet until the day it matters.

<img width="466" height="223" alt="Image" src="https://github.com/user-attachments/assets/43d69949-857d-43b5-8e07-2e9c1669e55a" />

### 4. Skills & tools used

- memory_read — reads active trials from trials/active.md
- memory_write — saves new trials and updates statuses (ACTIVE/URGENT/EXPIRED)
- time — gets today's date to calculate days remaining for each trial
- message — sends Telegram alerts at 5-day warning, 2-day urgent, and expiry
- routine/cron — checks all trials automatically every day at 9:00 AM

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
