### 1. Title

Turn starred Gmail messages into Todoist / Trello / Notion / Asana tasks with smart due dates

### 2. Example prompt

Every time I star a Gmail message, create a task for me in Todoist (or Trello, Notion, Asana) with a clear title, priority, and a smart due date parsed from the email body. I want inbox zero without losing action items.

### 3. What the agent does

On first run the agent asks the user which task app they want to use as the destination — Todoist, Trello, Notion, or Asana — and stores that choice. It also asks whether the user wants the starred email to be marked as read after a task is created, and stores that preference. From then on, the agent runs on a short polling trigger (e.g. every 8 hours) over the user's Gmail inbox using Zapier's "New Starred Email" trigger. When a new starred email is detected, the agent reads the email body and uses AI to extract:
- **(1)** a short imperative task title,
- **(2)** a due date if one is mentioned in the text (e.g. "let's meet Thursday", "by EOD Friday", "next Tuesday"), and
- **(3)** a priority hint based on urgency signals in the email (e.g. words like "urgent", "ASAP", "by EOD" → high priority; casual FYI language → low priority).

It then creates a task in the chosen app via the corresponding Zapier action (Todoist "Create Task", Trello "Create Card", Notion "Create Database Item", Asana "Create Task") with the extracted title, due date, and priority. The task description includes a one-line summary of the email plus a deep link back to the Gmail message. The agent does NOT archive or delete the original email — the user keeps full control of their inbox. If the email body has no clear action item, the agent still creates a task with a low-priority title like "Review email from X" so nothing is lost.

### 4. Skills & tools used

- Zapier MCP — required. Connects Gmail (trigger: New Starred Email) and the chosen task app (action: Create Task in Todoist / Trello / Notion / Asana). The user must install Zapier MCP and connect both accounts before first use.

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

Inspired by Kent's "Inbox Zero Without Losing Action Items" pattern — see also the email digest use case for the read-side counterpart.

### 7. Author (optional)

kent
