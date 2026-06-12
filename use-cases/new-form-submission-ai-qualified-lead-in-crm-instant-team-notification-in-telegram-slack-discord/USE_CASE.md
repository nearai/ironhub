### 1. Title

New form submission → AI-qualified lead in CRM → instant team notification in Telegram, Slack, Discord, or email

### 2. Example prompt

Whenever someone fills out a lead form on my site (Typeform, Webflow, Unbounce, Google Forms, JotForm, WPForms, etc.), push it to my CRM (HubSpot, Pipedrive, Salesforce, Zoho, or Notion-as-CRM) with an AI-generated lead score and tag, then ping my team on Telegram (or Slack, Discord, email — I pick).

### 3. What the agent does

On first run the agent asks the user:
- **(1)** which form tool they use as the source (Typeform, Webflow, Unbounce, Google Forms, JotForm, WPForms, or any other Zapier-supported form app),
- **(2)** which CRM they want leads pushed to (HubSpot, Pipedrive, Salesforce, Zoho, or Notion as a lightweight CRM), and
- **(3)** which channels to notify the team on (Telegram, Slack, Discord, email — single or multiple).

It also asks the user to define what "qualified" means to them. The user can either pick from a preset (basic contact info → score by completeness + recency; B2B intent → score by budget + timeline + company size; e-commerce lead → score by cart value + product interest) or define a custom scoring rubric in plain language (e.g. "score 1-10, +3 if they mention budget, +2 if they want a demo this month, -5 if it's a free-tier inquiry"). If the user says nothing, the agent falls back to a sensible default: score by form completeness, presence of a clear intent statement ("I want to buy", "I need a quote"), and any budget/timeline signals.

These preferences are stored. On every new form submission, the agent pulls the payload via Zapier's "New Submission" trigger for the chosen form tool, runs the user's qualification rubric (or the default) to produce a lead score (1-10) and a tag (e.g. hot / warm / cold, or a user-defined category), creates a contact + deal / record in the chosen CRM via the corresponding Zapier action (HubSpot "Create Contact", Pipedrive "Create Person + Deal", Salesforce "Create Lead", Zoho "Create Lead", Notion "Create Database Item"), and sends a notification to each selected channel (Telegram message, Slack message, Discord message, or email) with the lead's name, score, tag, and a one-line AI summary of what they want. The user can reconfigure scoring, channels, or destination CRM at any time by talking to the agent. The agent also keeps a short history of the last N leads so the user can ask on demand: "show me today's hot leads", "what's my best lead this week", "which channels are converting".

### 4. Skills & tools used

- Zapier MCP — required. Connects the form tool (trigger: New Submission for Typeform / Webflow / Unbounce / Google Forms / JotForm / WPForms), the CRM (action: Create Contact / Lead / Deal in HubSpot / Pipedrive / Salesforce / Zoho / Notion), and the notification channel(s) (action: Send Message for Telegram / Slack / Discord, or Send Email for Gmail / Outlook). The user must install Zapier MCP and connect the relevant accounts before first use.

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [x] Marketing / content
- [x] Business ops
- [x] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Never miss a lead; instant team awareness" pattern — the AI qualification step turns a dumb form-to-CRM pipe into a real triage workflow.

### 7. Author (optional)

kent
