---
name: microsoft-365-workflow
version: 1.0.0
description: Microsoft 365 business workflow patterns for the IronClaw agent. Covers Outlook email, Excel data operations, Teams channel communication, Word and PowerPoint document generation, and SharePoint and OneDrive file management via Microsoft Graph.
use_cases:
  - Automate Outlook email drafts and replies
  - Read and write Excel range data directly
  - Post status updates to Teams channels
value_prop: "Microsoft 365 business workflow patterns."
value_tags:
  - Automation
  - Productivity
activation:
  keywords:
    - "outlook"
    - "microsoft 365"
    - "office 365"
    - "m365"
    - "excel workbook"
    - "excel spreadsheet"
    - "powerpoint deck"
    - "word document"
    - "teams channel"
    - "teams message"
    - "sharepoint"
    - "onedrive"
    - "exchange mailbox"
    - "microsoft graph"
    - "azure ad"
    - "entra id"
    - "business partner integration"
    - "enterprise office suite"
  patterns:
    - "(?i)(send|draft|compose|reply\\s+to)\\s+(an?\\s+)?(outlook\\s+)?(email|mail|message)"
    - "(?i)(read|update|write\\s+to|populate|pull\\s+data\\s+from)\\s+(an?\\s+)?(excel|xlsx|spreadsheet|workbook)"
    - "(?i)(post|send)\\s+(to|a\\s+message\\s+to)\\s+(a\\s+)?teams\\s+(channel|group|chat)"
    - "(?i)(generate|create|draft)\\s+(a\\s+)?(word|powerpoint|pptx|docx)\\s+(document|deck|presentation)"
    - "(?i)(upload|share|store)\\s+(to|a\\s+file\\s+(to|on))\\s+(sharepoint|onedrive)"
    - "(?i)(schedule|book|find\\s+a\\s+time\\s+for)\\s+(a\\s+)?(teams|outlook)\\s+(meeting|call)"
  tags:
    - "productivity"
    - "microsoft"
    - "office-automation"
    - "enterprise"
  max_context_tokens: 6500
---

## When to Use

- **Enterprise business partner workflows.** The partner lives in Microsoft 365: email through Outlook, documents in SharePoint, data in Excel, chat in Teams. Generic tooling does not integrate; Microsoft-specific tooling does. Use this skill whenever the user references any Microsoft product by name or implies an Office 365 context.
- **Drafting email from an executive or business voice.** Outlook messages for customers, investors, partners, or internal leadership. The draft-first protocol applies: never send without explicit approval.
- **Operating on Excel data at the cell and range level.** Reading quarterly reports, updating forecast worksheets, populating status rows, generating summary dashboards. This goes beyond file download. The agent reads and writes ranges directly via the Graph workbook API.
- **Posting to Teams channels as part of an agent workflow.** Status updates, release announcements, escalation pings to a channel owned by the user's tenant. Respect the same draft-first rule as email.
- **Generating Word or PowerPoint deliverables.** Drafts of customer-facing proposals, internal memos, weekly summary decks. Output is uploaded to OneDrive or SharePoint and a share link is returned.
- **Scheduling meetings with internal colleagues or external contacts.** Outlook calendar coordination, find-meeting-times, create-event. Respect the recipient's stated availability and time zone.
- **File management across SharePoint and OneDrive.** List document libraries, download files into the agent workspace for processing, upload results back, create share links with scoped permissions.
- **Cross-service workflows.** Read Excel, summarize in Word, upload to SharePoint, email the link. Multi-step Microsoft chains are the common case for enterprise partner requests.

## Do NOT Use This Skill For

- Generic email not tied to a Microsoft mailbox. Use a generic SMTP/IMAP path instead if the user has no Microsoft account connected.
- Open-source office tools (LibreOffice, Google Workspace). Google Docs/Sheets/Gmail live in a separate skill; Microsoft integrations go through Microsoft Graph exclusively.
- Raw REST calls to Graph when a typed tool action exists. Prefer the `microsoft-365` tool's structured actions over `http-request` to `graph.microsoft.com`.
- User personal accounts when the partner requires tenant isolation. Business integrations run against the partner's Microsoft Entra ID tenant, not an individual Microsoft account.

## Required Tool

All live Microsoft operations route through the `microsoft-365` tool (`tools/microsoft-365/` in the contribution repo). The tool wraps Microsoft Graph v1.0 and handles OAuth 2.0 token refresh via the IronClaw host.

Live actions across the 365 suite: `me`, `send_mail`, `list_recent_messages` (Outlook); `list_drive`, `upload_file` (OneDrive and SharePoint); `read_excel_range`, `write_excel_range` (Excel workbook); `list_teams`, `list_channels`, `send_channel_message` (Teams); `list_calendar_events`, `create_calendar_event` (Outlook Calendar); `create_word_document`, `create_powerpoint` (structured document generation with upload to OneDrive). Teams actions require an organizational tenant; personal Microsoft accounts receive 403 because Microsoft does not serve those endpoints to consumer accounts. Surface that boundary honestly when it applies; do not fabricate success.

Authentication is per-user OAuth. The user registers an application in Microsoft Entra ID, exports `MICROSOFT_OAUTH_CLIENT_ID` and `MICROSOFT_OAUTH_CLIENT_SECRET` into the IronClaw host environment, and runs `ironclaw tool auth microsoft-365` to launch the consent flow. Tokens refresh automatically and the agent never sees raw credentials.

## Draft-First Protocol (Non-Negotiable)

Every message, email, Teams post, document, or calendar invite goes through three phases:

1. **Draft.** Produce the content with a clear label of `DRAFT, not sent`. Include every structural element the final artifact will have (subject, recipients, body, attachments, share scope). Never send in the same turn.
2. **Review.** Present the draft to the user and wait for explicit approval. Silent acceptance is not approval; a reply of "send it" or similar is.
3. **Execute.** Call the `microsoft-365` tool only after approval. Capture the resulting ID (message-id, event-id, document share URL) and return it so the user has evidence the side effect landed. Hedge clearly if the tool returns `unverified`. The outbound call was made but the external read-back did not confirm.

Drafts live in the conversation, not in the user's mailbox. The agent never stores a silent draft to Outlook drafts without being asked.

## Outlook Email Patterns

**Subject line discipline.** Business partners expect short, specific subjects. Avoid internal jargon. Use the form `<Context>: <Ask>`. Example: `Q2 forecast review: input needed by Thursday`.

**Recipient hygiene.** Primary recipients in To:, stakeholders in Cc:, external or privacy-sensitive recipients in Bcc:. Never Bcc internal legal or compliance without explicit user instruction.

**Body structure for business email.**
- Opening: one sentence of context.
- Ask: single explicit request in bold or its own paragraph.
- Support: 2-4 sentences of detail, data, or links.
- Close: next step with owner and due date.

**Reply vs. new thread.** Reply when the conversation is ongoing and the user wants context preserved. Start new when the topic shifts or privacy demands a clean recipient list. When in doubt, ask the user.

**Attachments.** Use share links from OneDrive or SharePoint rather than raw attachments when the file is larger than 2 MB or sensitive. Share link scoping: default to organization-wide read; escalate to specific-people-only when the content is commercially sensitive or pre-announcement.

**Out-of-office awareness.** If the user's calendar shows they are out, default email sends to draft mode unless the user explicitly overrides. Do not auto-send on their behalf when they cannot respond to follow-ups.

## Excel Patterns

**Read before write.** Always fetch the current range (or a representative sample) before writing. Excel data often contains merged cells, data-validation rules, or formulas that plain-text writes will corrupt. Report back what you observed before proposing a write.

**Address references precisely.** Graph's workbook API accepts A1 notation (`Sheet1!B2:D10`) and named ranges. Prefer named ranges when the workbook defines them, since named ranges survive row insertion and rename.

**Preserve formulas.** When writing to a cell that previously contained a formula, either (a) write a new formula, (b) overwrite with a literal value and warn the user, or (c) append to an adjacent cell instead. Never silently replace a formula with its current evaluated result, since that destroys the workbook's ability to recalculate.

**Respect format.** If the source column is currency-formatted, write currency-shaped values. If it's a date column, write ISO-8601 dates or Excel serial dates, not human-readable strings that Excel will interpret as text.

**Summaries live in a separate sheet.** Never overwrite source data with a summary. Create or update a "Summary" worksheet, leave the raw data intact, link results with formulas referencing the source.

## Teams Channel Patterns

**Channel ID, not name.** Teams channel names are not unique across teams. Always resolve the team and channel to their GUIDs before posting. The `microsoft-365` tool's `list_teams` and `list_channels` actions return the IDs the post action requires.

**Posting etiquette.** Channel posts are visible to all team members. Use mentions (`@person`) sparingly, since a spammed channel trains the team to ignore bot messages. Urgent pings go to direct message, not channel.

**Formatting.** Teams accepts HTML and adaptive cards. For agent-authored status updates, adaptive cards produce cleaner-looking results than raw HTML. Reserve plain text for short replies inside a thread.

**Thread continuity.** Reply in-thread for follow-ups to an existing conversation. A new top-level message for each related update fragments the thread and buries context.

## Word / PowerPoint Patterns

**Graph has no cell-level Word or PowerPoint editing API.** Document creation runs through `create_word_document` and `create_powerpoint`, which accept structured input (title, subtitle, sections, paragraphs, tables for Word; title and bulleted slides for PowerPoint) and assemble the `.docx` or `.pptx` in-tool before uploading to OneDrive. The tool returns the drive item id and web URL so the agent can share a link immediately. For more complex layouts that exceed the structured schema, produce the document locally through another pipeline and upload the raw bytes via `upload_file`.

**Template-driven.** Enterprise partners typically have branded templates. Prefer opening a template from SharePoint, populating placeholders, uploading the populated copy. Never generate a generic "looks-like-our-template" document unless the user has confirmed no template is mandated.

**Revision tracking.** When editing a Word document on behalf of the user, surface your changes in a summary so the user can accept or reject at document-open time. Do not silently rewrite sections without flagging what changed.

## SharePoint / OneDrive Patterns

**Site and drive resolution.** SharePoint sites and document libraries have URLs users recognize and GUIDs the API requires. Always resolve URL to GUID before file operations. Cache the resolution for the session.

**Share link scoping.** Three scope levels: anonymous (anyone with the link), organization (signed-in members of the user's tenant), specific people (explicit email allowlist). Default to organization. Escalate to specific-people when the content is pre-announcement, commercial, or contains PII.

**File size limits.** Graph's simple upload caps at 4 MB. Anything larger must use an upload session (chunked upload). The `microsoft-365` tool handles both under a single `upload_file` action, so the agent does not need to switch modes manually.

**Check-in / check-out.** Document libraries with versioning require check-out before edit, check-in after. Respect this; bypassing check-out creates minor-version forks that confuse the partner's document owners.

## Calendar Patterns

**Time zone explicit.** Always specify time zones in ISO-8601 offsets or IANA names. "3pm" is ambiguous; "2026-04-24T15:00:00-07:00" is not.

**Find-meeting-times first.** When scheduling with multiple attendees, call the find-meeting-times action before proposing a slot. It accounts for everyone's free/busy and returns ranked candidates. Do not guess a time and hope.

**Optional vs. required attendees.** Mark attendees correctly. Required attendees block scheduling; optional attendees do not. Miscategorizing leads to cancelled meetings or over-blocked calendars.

**Accept, decline, tentative.** When responding to invites on the user's behalf, default to tentative with a request for user confirmation unless the user has pre-approved auto-accept for a specific sender.

## Cross-Service Workflows

Common enterprise chains the agent should recognize and execute end-to-end after approval:

- **Quarterly report.** Read Excel forecast data, summarize in Word, upload to SharePoint, email share link to stakeholders.
- **Release announcement.** Draft release note in Word, upload to OneDrive, post adaptive card to Teams channel with share link, email external customers via Outlook.
- **Meeting prep.** List calendar events for the next 24 hours, then for each pull the agenda from the event body or linked OneDrive doc, then produce a prep brief.
- **Data refresh.** Pull CSV from an external source, write to named range in Excel, update formulas, notify the workbook owner via Teams direct message.

## Authentication & Permissions

The tool's OAuth scope set must be granted at consent time in Microsoft Entra ID. Adding scopes later requires a new consent flow. Default scope bundle: `Mail.ReadWrite Mail.Send ChannelMessage.Send Team.ReadBasic.All Channel.ReadBasic.All Files.ReadWrite.All Sites.ReadWrite.All Calendars.ReadWrite User.Read offline_access`.

If any action returns 403 Forbidden with an `InsufficientScope` error, the scope set is incomplete. Surface the specific missing scope to the user with instructions to re-consent.

Tenant restrictions: enterprise partners often disable third-party app installs. The user may need tenant admin approval before the application can authenticate. Handle the `invalid_grant` error from the token endpoint by surfacing this specifically, not as a generic auth failure.

## Error Handling

- **401 Unauthorized.** Token expired and refresh failed. Prompt the user to re-run `ironclaw tool auth microsoft-365`.
- **403 Forbidden / InsufficientScope.** Scope missing from the consent grant. Surface the specific scope and consent URL.
- **429 Throttled.** Graph enforces per-tenant limits. Back off per the `Retry-After` header; the tool does this automatically but the agent should warn the user if a long wait is required.
- **404 Not Found.** Usually a stale ID (channel renamed, document moved). Re-list the parent resource and retry.

## Out of Scope

- Personal account (`@outlook.com`, `@hotmail.com`) flows when the user's context is an enterprise partner. Use the partner's tenant.
- Microsoft Intune and device management. Separate API surface, out of scope for this skill.
- Dynamics 365, Power Platform, Fabric. Separate products with their own auth and APIs.
- Skype for Business: retired and not supported.
- On-premises Exchange or SharePoint. This skill assumes cloud-hosted Microsoft 365 only.
