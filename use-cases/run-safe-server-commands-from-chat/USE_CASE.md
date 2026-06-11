### 1. Title

Run safe server commands from chat

### 2. Example prompt

"Check disk usage on my server, show the last 50 error logs, and restart Nginx if everything looks safe."

### 3. What the agent does

Translates your plain-English request into safe shell commands, explains what it is about to run, executes approved commands, and returns the output in chat. It can handle quick server tasks like checking disk space, viewing logs, restarting services, clearing caches, or confirming whether a process is running.

### 4. Skills & tools used

- Safe Shell Command Runner — runs approved shell commands with guardrails, confirmation, and output logging
- Server Access / SSH tool — connects securely to the selected server or environment
- Command Approval Policy — blocks destructive or risky commands unless explicitly reviewed
- Log Reader tool — fetches recent service, app, or system logs

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

_No response_

### 7. Author (optional)

Halfblood
