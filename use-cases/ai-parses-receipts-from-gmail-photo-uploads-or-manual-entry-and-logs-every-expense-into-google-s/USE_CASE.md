### 1. Title

AI parses receipts from Gmail, photo uploads, or manual entry and logs every expense into Google Sheets (or Notion, Airtable) with a tax-deductible flag

### 2. Example prompt

Whenever I get a receipt — via email, a photo I send you, or me pasting the text — extract the merchant, date, amount, currency, tax, category, payment method, and whether it's tax-deductible, then log it into my Google Sheet. I want zero manual data entry and I want tax season to be a single export.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** which sources to accept — Gmail (Zapier or native trigger on incoming mail matching receipt keywords), photo upload (the user can send a receipt photo to the agent via Telegram, Slack, or email and the agent OCRs it), and manual entry (the user forwards or pastes raw text). The user can enable any combination.
- **(2)** Where to store expenses. The default is Google Sheets because it is the most common choice for freelancers and small business owners and exports cleanly into any tax tool. The agent also suggests Notion (database) and Airtable as alternatives — if the user picks one of those, the agent connects it through Zapier MCP, Make.com, or Composio, whichever the user already has or prefers.
- **(3)** The category list to use (default: software / subscriptions / travel / meals / utilities / office / other — fully user-replaceable).
- **(4)** How strict the "deductible" flag should be — strict (only flag when the AI is highly confident), lenient (flag by default, user un-checks false positives), or off entirely.

These preferences are stored. On every new receipt from any enabled source the agent runs AI extraction to produce: merchant, date, amount, currency, tax, category, payment method, free-text notes, and the deductible flag. It then appends a new row to the chosen storage (Google Sheets via Zapier "Create Spreadsheet Row" or native, Notion "Create Database Item" via Zapier / Make.com / Composio, or Airtable "Create Record" via Zapier). For photo receipts the agent also keeps a link to the original image alongside the row.

The user can at any time ask the agent for an on-demand view ("what did I spend on travel this month", "show me all deductible expenses for Q1", "total tax I paid on software last 90 days"), change categories, switch storage destination, or trigger an export ("send me a CSV of all expenses this year", "give me a tax-ready summary grouped by deductible category"). The agent also supports a quarterly nudge: at the end of each quarter it sends a one-line reminder with the quarter's deductible total so the user can plan ahead for tax season.

### 4. Skills & tools used

- Zapier MCP — required for Gmail ingestion, Google Sheets writing, and any of Notion / Airtable storage. Also useful for delivery of nudges and exports.
- Composio — optional alternative to Zapier for Notion, Airtable, and Google Sheets actions, if the user prefers it.
- Make.com — optional alternative for the same Notion / Airtable / Google Sheets actions.
- Telegram MCP — required if the user picks Telegram as a photo upload channel.
- Slack MCP — required if the user picks Slack as a photo upload channel.
- Gmail MCP — required if the user picks email as a photo upload channel (forward the image, agent reads the attachment).

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

Inspired by Kent's "AI-powered expense tracking from receipts — eliminates manual data entry for expenses / taxes" pattern — pairs with the invoice weekly report use case for the read-side digest, and complements any accounting or tax-prep workflow as a pure capture layer.

### 7. Author (optional)

kent
