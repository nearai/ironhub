### 1. Title

Index every text message in your Telegram Saved Messages, then ask the agent to find, summarise, or "chat with" your past notes — no cloud upload, no attachment indexing, no write back

### 2. Example prompt

Index all the text I've ever saved into my Telegram Saved Messages so I can ask things like "3 months ago what did I save about NEAR Intents" or "summarise every idea I had about a WooCommerce plugin last quarter" and get an answer pulled from my own past self. Text only — never index attachments.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the Telegram account to use — the user authenticates a user-account session via MTProto (the agent explicitly warns the user that Telegram's TOS restricts user bots, that accounts can be banned for abuse, and that the user is responsible for complying with Telegram's rules). The user picks a read-only scope: the agent will read Saved Messages, build an index, and answer questions; it will not post, not edit, not delete, not forward, and will not index any attachment (no image, no PDF, no audio, no video, no voice message, no sticker, no document — the no-attachment rule is a hard constraint and is enforced at the MTProto client level).
- **(2)** The lookback window — the user picks how far back to index (last 30 days, last 90 days, last year, all-time). The default is last year.
- **(3)** The index location and reply style — where the searchable history lives and how the agent answers; a local-first setup keeps everything on the machine where the agent runs.
- **(4)** The re-index cadence — the agent re-scans Saved Messages on a schedule the user picks (default nightly) and updates the index incrementally so new saves show up the next morning.
- **(5)** The default reply style — the agent answers in a tight conversational tone with 3-5 sentence summaries and direct quotes from the saved messages (with the original date and a Telegram deep link back to the source message), or a longer "deep dive" that quotes more context; the user can pick per question.

These preferences are stored.

On every fire the agent reads new Saved Messages since the last index run, extracts the text, indexes it, and updates the searchable history. When the user asks a question, the agent runs a semantic search over the index, returns the top matches with date, source link, and a one-line excerpt, and (if the user asked for a summary) produces a tight synthesis that reads like a conversation with the user's past self — "you saved 4 things about NEAR Intents between June and September, mostly focused on cross-chain solver liquidity, with one contrarian note that intents would be undercut by order-book DEXs". The agent never sends a Saved Message to any external service and never modifies Saved Messages.

The user can at any time ask the agent to re-index, expand the lookback window, switch the default reply style, or pause indexing entirely.

Hard constraints:
- **(1)** No attachment indexing — the agent MUST NOT download, OCR, transcribe, or index any file attachment (image, PDF, audio, video, voice message, sticker, document); only text message bodies and text captions are indexed, enforced at the MTProto client level.
- **(2)** No write back to Telegram — the agent MUST NOT post, edit, delete, forward, or pin any message on the user's behalf; the index is observational and the user reads the answer and acts manually in the Telegram app.
- **(3)** Local-first data — by default the agent MUST NOT upload the index or the message text to any external service.

### 4. Skills & tools used

- Telegram MTProto client (e.g. TDLib, Pyrogram, Telethon) — required. Used for the read-only operation: read Saved Messages, extract text, retrieve message metadata. The MTProto client is configured at install time to refuse any "download media" call so the no-attachment constraint is enforced in code, not just in policy.
- Web search / fetch — optional. Used only when the user asks "what is this about" on a specific saved message, to enrich the answer with a one-line public context.

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

Inspired by Kent's "Saved Messages → smart search / chat with your past self" pattern, built on the same read-only MTProto foundation as the group-monitoring and DM-recap use cases. This is the lowest-TOS-risk use case in the Telegram user-bot family because every operation is read-only on the user's own private Saved Messages.

### 7. Author (optional)

kent
