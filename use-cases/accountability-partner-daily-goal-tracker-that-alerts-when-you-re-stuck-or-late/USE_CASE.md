### 1. Title

Accountability Partner — Daily goal tracker that alerts when you're stuck or late

### 2. Example prompt

You are my accountability partner. Store my goals in memory at goals/active.md

When I say "add goal: [description] by [deadline]":
1. Read memory at goals/active.md
2. Add new goal with: description, deadline, status (IN PROGRESS), created date, last update date, progress notes
3. Write back to memory

When I say "update goal [name]: [progress]":
1. Read memory at goals/active.md
2. Find the goal, update progress notes and last update date
3. Write back to memory

For the daily routine — run every day at 9:00 AM:
1. Read memory at goals/active.md
2. For each goal with status IN PROGRESS:
   - Calculate days since last update
   - Calculate days until deadline
   - If days since last update >= 3: flag as STUCK
   - If days until deadline <= 2: flag as URGENT
3. Send Telegram message only if there are STUCK or URGENT goals:

"⚡ Accountability Check

🔴 STUCK (no update in 3+ days):
- [goal name] — last update [X] days ago
  💬 Last note: [last progress note]

🟡 URGENT (deadline in 2 days or less):
- [goal name] — due [date]

💪 Still on track:
- [goal name] — [X] days until deadline"

If all goals are on track: reply HEARTBEAT_OK and stop.

### 3. What the agent does

You tell the agent your goals and deadlines once. Every morning at 9 AM it reads your goal list from memory, checks how long ago you last updated each goal and how close the deadline is. If you haven't logged any progress in 3+ days it flags the goal as STUCK. If the deadline is 2 days away or less it flags as URGENT. You only get a Telegram message when something actually needs your attention — silent run otherwise. Update your progress anytime by texting the agent, and it updates the memory file.

<img width="530" height="280" alt="Image" src="https://github.com/user-attachments/assets/d260c733-b9bb-4c2f-874f-8db3d65eb0ad" />

### 4. Skills & tools used

- memory_read — reads active goals from goals/active.md
- memory_write — saves new goals and progress updates to goals/active.md
- time — calculates days since last update and days until deadline
- message — sends Telegram alert only when goals are STUCK or URGENT
- routine/cron — runs the accountability check automatically every day at 9:00 AM

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
