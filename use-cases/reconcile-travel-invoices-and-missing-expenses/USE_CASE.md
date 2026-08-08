### 1. Title

Reconcile travel invoices and missing expenses

### 2. Example prompt

Reconcile last month's Perk travel invoices against the trips we actually took, and tell me which expenses are still missing receipts.

### 3. What the agent does

Pulls the period's travel invoices from Perk and expands the ones that need scrutiny to line level, where mismatches actually appear. Cross-checks them against the trips recorded for the same period, then queries live expense data to find entries still missing a receipt, a category, or a trip association.

Returns three things: a reconciliation table with any mismatched or unexplained lines called out, a checklist of incomplete expenses ordered by age, and an explicit note of how fresh each number is, because Perk's live expense data and its aggregated reporting data do not agree during the same day.

It does not book travel, submit expenses, or approve anything. Where a result set is empty, it distinguishes "nothing matched" from "not visible to this account", since Perk scopes many reads by the connected user's role.

### 4. Skills & tools used

- perk-travel-expense — drives the Perk MCP for trips, expenses, travel invoices and invoice lines, and states the freshness of each source
- perk — first-party Perk MCP providing the travel, spend and invoicing data

### 5. Categories

- [ ] Personal assistant
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

Brandon
