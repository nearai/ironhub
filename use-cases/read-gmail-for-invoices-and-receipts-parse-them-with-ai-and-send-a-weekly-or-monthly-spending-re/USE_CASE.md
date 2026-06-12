### 1. Title

Read Gmail for invoices and receipts, parse them with AI, and send a weekly or monthly spending report

### 2. Example prompt

Every week (or every month — I pick), scan my Gmail for invoices and receipts, parse out the merchant, amount, currency, date, category, tax, and payment method, and send me a clean spending report with a total, top merchants, category breakdown, and the full invoice list.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** cadence — weekly or monthly (the user picks), the day of week or day of month to send, and the time + timezone,
- **(2)** the base currency to report in (so multi-currency totals collapse into one number, with the per-invoice original currency preserved for reference),
- **(3)** what counts as an "invoice" — the agent gives three signals and the user can enable any combination: subject / title keywords ("invoice", "receipt", "bill", "hóa đơn", "biên lai", or user-defined words), known sender list (the user can whitelist specific vendors and billing systems), and sender domain patterns (e.g. anything from @stripe.com, @aws.amazon.com).

PDF and image attachments are intentionally out of scope — the agent reads from email title, sender, and body description only, keeping the flow lightweight. For each matching email the agent uses AI to extract: merchant name, amount, currency, invoice date, category (the user can keep the default set — software / subscription / travel / food / utilities / other — or replace it with their own list at any time), tax amount, and payment method if mentioned (credit card last 4, PayPal, bank transfer, etc.). The agent stores these in a running per-user ledger.

On every fire the agent pulls the relevant Gmail messages via Zapier (Gmail "List Emails" + "Get Email" actions), runs the filter and extraction, and produces a report with:
- **(a)** a headline total in the base currency,
- **(b)** the top 5 merchants by spend,
- **(c)** a category breakdown (text pie or bar — no chart image needed), and
- **(d)** a compact table of every invoice in the period showing merchant / date / amount / category / payment method.

The report is delivered to the channel the user picks — Slack "Send Channel Message", Telegram "Send Message", or Gmail "Send Email".

The user can at any time ask the agent for an on-demand report ("show me this month so far", "what did I spend on software in Q1", "how much went to AWS last 90 days"), change the cadence, add or remove category tags, or whitelist a new vendor.

### 4. Skills & tools used

- Zapier MCP — required. Connects Gmail (action: List / Search / Get Email) and the chosen delivery channel (Slack "Send Channel Message", Telegram "Send Message", or Gmail "Send Email"). The user must install Zapier MCP and connect the relevant accounts before first use.

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

Inspired by Kent's "Read Gmail mails → find invoices → report weekly spent" pattern — pairs with the email-digest use case for a read-only companion, and with the starred-emails-to-tasks use case for the action-side follow-up on flagged invoices.

### 7. Author (optional)

kent
