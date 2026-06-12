### 1. Title

A read-only Telegram user bot (MTProto) that gives founders / VCs a 5-minute daily DM recap grouped by who needs a reply, and logs a per-day contact history — never downloads attachments, never sends anything

### 2. Example prompt

I'm a founder / VC / operator. Every morning give me a 5-minute recap of all the DMs I got in the last 24 hours — who's waiting on me, what's just FYI, what's noise — and log every contact interaction into a daily Markdown file in my Saved Messages. Read-only. Never download attachments. Never auto-reply.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the Telegram account to use — the user authenticates a user-account session via MTProto (the agent explicitly warns the user that Telegram's TOS restricts user bots, that accounts can be banned for abuse, and that the user is responsible for complying with Telegram's rules). The user picks a read-only scope: the agent will view messages, view contact profiles, view chat history, and log a daily summary; it will not draft replies, not auto-reply, not auto-add contacts, not auto-join groups, not cross-post, and will not download or persist any attachment (no PDF, no image, no audio, no video — the attachment rule is a hard constraint and is enforced at the MTProto client level).
- **(2)** Volume tier — low (under 10 DMs / day, single morning recap), medium (10-50 DMs / day, single morning recap plus an optional mid-day check), or high (50+ DMs / day, two recaps per day plus per-thread summarization). Default is medium.
- **(3)** Recap cadence and delivery — daily recap time + timezone (no default; the user must pick), and the delivery channel (Telegram DM back to the same user bot account is the default, with Slack and email as alternatives).
- **(4)** Where to store the contact log — the default is a local Markdown file per day at a path the user picks (e.g. ~/telegram-recap/contacts-YYYY-MM-DD.md), and the agent mirrors the same file as a message into the user's Telegram Saved Messages so the log is always retrievable from the phone. The user can switch to Notion (database with fields: contact handle, contact name, last interaction, summary, needs-reply flag, link to thread), Google Contacts (sync to a labeled group), or Airtable.
- **(5)** Priority grouping rules for the recap — the agent suggests a default (needs-reply if the last message in the thread is from the other party and contains a question, an ask, or a clear call to action; FYI if the message is informational with no question; can-skip for automated notifications, opt-in marketing, or anything the user has previously muted), and the user can refine the rules.

These preferences are stored.

On every fire the agent reads the last 24 hours of incoming DMs to the user bot account via the MTProto session, applies the priority grouping rules, and produces a tight 5-minute recap with: a one-line headline ("today: 23 DMs, 5 need a reply, 3 FYI, 15 noise"), a needs-reply section listing each contact with a 1-3 line summary of what they want, a FYI section with the same per-contact format, and a single one-line "noise" count rather than a list.

The recap is delivered to the chosen channel. At the same time the agent appends a per-day Markdown entry to the local contact log file, with one section per contact that has had any interaction in the window (handle, name, last message excerpt, summary, link to the Telegram thread, priority group). The file is then mirrored as a single message into the user's Saved Messages (or sent to the chosen destination). The agent never downloads or saves any attachment — if a contact sent a file, the recap line for that contact notes "attachment sent (not downloaded)" so the user knows to look in the original thread, and the agent does not retain a copy.

The user can at any time ask the agent for an on-demand view ("recap my DMs from the last 6 hours", "give me the full thread with Alice from this week", "what did Bob say about the Series A"), change the volume tier, refine priority rules, switch storage destination, or pause the recap entirely.

Hard constraints:
- **(1)** No attachment downloads — the agent MUST NOT download, save, mirror, OCR, transcribe, or otherwise persist any file attachment (image, PDF, audio, video, voice message, sticker, document); this is enforced at the MTProto client level, and if a contact sends a file the recap notes "attachment sent (not downloaded)" and the user is expected to look in the original thread.
- **(2)** Read-only — the agent MUST NOT draft a reply, send a message, add a contact, join a group, leave a group, or cross-post to a channel on the user's behalf; every output is observational and the user reads the recap and acts manually.

### 4. Skills & tools used

- Telegram MTProto client (e.g. TDLib, Pyrogram, Telethon) — required. Used for the read-only operations: view incoming DMs, view contact profiles, view chat history, and post a single mirror message to Saved Messages. The MTProto client is configured at install time to refuse any "download media" call so the no-attachment constraint is enforced in code, not just in policy.
- Web search / fetch — optional. Used only when the user asks "what is this about" on a specific contact, to enrich the recap with a one-line public context.
- Zapier MCP — required for delivery of the recap to Slack or email (Telegram DM delivery is handled directly by the MTProto client). Also used to write to Notion or Airtable if the user picks one of those storage destinations.
- Composio — optional alternative to Zapier for the same delivery and storage-write actions.
- Slack MCP — required if Slack is the delivery channel.
- Gmail MCP — required if email is the delivery channel.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Telegram user bot for founder / VC personal assistant — auto read messages, daily recap, contact management" pattern, intentionally read-only and explicitly no-attachment-downloads to stay within Telegram's TOS and to keep the user's media private. Built on the same MTProto foundation as the group-monitoring use case and a natural pairing: group monitoring covers group signal, this covers 1:1 DM signal.

### 7. Author (optional)

kent
