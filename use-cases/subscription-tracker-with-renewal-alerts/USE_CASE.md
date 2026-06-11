### 1. Title

Subscription Tracker with Renewal Alerts

### 2. Example prompt

I keep forgetting about renewals until the charge hits my card. Here's what I pay for: Netflix $15.99/month (June 12), Spotify $9.99/month (June 25), ChatGPT Plus $20/month (July 1), GitHub Pro $4/month (July 10). Save them, show me my total monthly spend, and set up a daily automatic check that pings me in Telegram 3 days before any renewal — without me having to ask every time.

<img width="809" height="546" alt="Image" src="https://github.com/user-attachments/assets/ccad77ca-ee4e-4c14-a965-9620c968379f" />

### 3. What the agent does

The agent saves each subscription — name, amount, and renewal date — to its persistent memory. It adds up your total monthly spend and immediately flags anything renewing within the next 3 days.

A daily routine runs every morning in the background: it reads your subscription list, checks which renewals are coming up, and sends a Telegram alert 3 days before each one with the service name, amount, and exact date — so you're never caught off guard or paying for something you forgot about.

You can add new subscriptions anytime just by telling the agent, and it updates the list and recalculates your spend instantly. You can also drop a screenshot of a renewal email or receipt and the agent will extract the details automatically without any manual typing.

<img width="402" height="418" alt="Image" src="https://github.com/user-attachments/assets/1d922d2b-c686-424e-822a-84c14c5c2927" />

### 4. Skills & tools used

- `memory_write` / `memory_read` (built-in) — saves each subscription (name, amount, renewal date) and reads them back for the daily check → https://docs.ironclaw.com/capabilities/memory/memory
- `image_analyze` (built-in) — reads receipt screenshots or renewal email images to extract subscription details automatically → https://docs.ironclaw.com
- `time` (built-in) — checks today's date against renewal dates to calculate days remaining
- `message` / Telegram channel (built-in) — sends the 3-day renewal alert to your Telegram → https://docs.ironclaw.com/channels
- Routines / cron (built-in) — runs the daily renewal check automatically every morning, no need to trigger manually → https://docs.ironclaw.com/capabilities/routines/cron
- name: Subscription name — Required by this use case.
- price: Monthly price in USD — Required by this use case.
- next_payment: Date of next payment — Required by this use case.
- currency: Currency (USD) — Required by this use case.
- No external skills installed — Used built-in IronClaw tools only
- Custom Python logic — Date comparison, filtering, table formatting
- $0 — All tools are built into IronClaw, no external API calls needed

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
