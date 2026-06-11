### 1. Title

Track all my packages and ping me on delivery or delays

### 2. Example prompt

Watch my Gmail for shipping confirmations, track every package across FedEx, UPS, DHL, and USPS, and DM me on Telegram when something's out for delivery or delayed.

### 3. What the agent does

Occasionally Scans the user's inbox for order and shipping confirmation emails, extracting tracking numbers along with the carrier and item description. For each tracking number, it queries the relevant carrier's tracking endpoint on a schedule (e.g. every 2 hours) and maintains a live dashboard of all in-flight shipments with status, ETA, and last-known location. When a package transitions to "out for delivery," gets stuck in one location past a threshold, or is flagged as delayed/exception, the agent fires an alert to the user's chosen channel (Telegram, etc).

### 4. Skills & tools used

- Gmail Connection (MCP) — Required by this use case.
- Carrier tracking skill — wraps FedEx, UPS, DHL, USPS, and Amazon Logistics tracking APIs into one unified interface. ref: https://www.aftership.com/docs/tracking/quickstart (AfterShip aggregates all major carriers in one API) or https://www.easypost.com/docs/api#trackers
- Tracking number parser skill (LLM extraction from email bodies) — Required by this use case.
- Corn Job to make it as an automation — Required by this use case.
- Telegram / Signal / Slack MCP for alert delivery — Required by this use case.
- Lightweight dashboard skill (renders the current shipment table as a web view or Notion page) — Required by this use case.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

halfblood
