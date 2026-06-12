### 1. Title

Follow source Telegram channels, rewrite each post in your target language and voice, batch them into a digest, and post to your owned target channel — with a hard no-spam throttle

### 2. Example prompt

Follow these 3 Russian news channels, rewrite the posts in English in a casual / social tone with a "📰" header and a source-attribution footer, batch them into one digest post every 3 hours, and publish to my owned English-language channel. No spam. I can tweak the voice and the format per source-target pair.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the source channels (any number — the user pastes @usernames or invite links, all of which are read-only so the user can follow as many as they like without spam risk) and the target channels (one or more, where the user is admin / owner — the agent notes that posting to channels the user does not own can result in Telegram flagging the account).
- **(2)** The translation-and-rewrite voice — the user can pick from defaults: literal translate (preserves the original sentence structure), journalist / news-writer (punchy headline, factual body, neutral tone), or casual / social (hook-friendly, emoji-friendly, social-media voice).

The user can also paste a custom system prompt that the agent will use for every rewrite on that source-target pair. Each source-target pair keeps its own voice config so the user can have, for example, a literal voice for a regulatory source and a casual voice for a meme source without cross-contamination. (3) The post format per source-target pair — plain text, with a header (e.g. "📰 News from @source — translated to EN"), with a footer attribution (e.g. "Auto-rewritten from @source, original: [link]"), or as a multi-bullet digest that rolls N source posts into a single target post with one bullet per source item. (4) Attachment behavior per source-target pair — skip (do not forward any attachment; the rewrite is text-only), reference only (the digest notes "source post has an image — link" without downloading or forwarding the file), or forward (the MTProto client forwards the attachment from the source message to the target channel; this is the only mode that touches the attachment, and the hard no-download rule still applies — the agent forwards the file reference through MTProto, it does not save a local copy). (5) The batched cadence — the user picks a global interval (1 hour, 3 hours, 6 hours, or a custom cron expression; default is 3 hours), and can override per source-target pair if needed. (6) The throttle — the user picks a maximum number of posts per hour per target channel (default 5) so the channel does not look like a spam bot. (7) The delivery of low-signal events — a recap of what was rewritten in the last batch is sent to the user's Saved Messages (or Slack / email) so the user can audit.

These preferences are stored. On every batch tick the agent reads the source channels that have not been processed yet, rewrites each new post in the target language and voice, applies the per-pair format, and either posts the digest or the individual rewrites to the target channel. The throttle is checked before every send.

The user can at any time ask the agent for an on-demand batch ("rewrite and post the last 6 hours of @source now"), pause a specific source-target pair, change the voice or the format, change the throttle, or switch the cadence.

Hard constraints:
- **(1)** No attachment downloads to local storage — the agent MUST NOT download, save, mirror, OCR, transcribe, or otherwise persist any file attachment; when the user picks "forward" for a source-target pair, the agent uses the MTProto forward-by-reference call which streams the file from Telegram to Telegram without a local copy, enforced at the MTProto client level.
- **(2)** No spam — the agent MUST NOT exceed the user-configured throttle (max posts per hour per target channel); if a batch tick would exceed the throttle, the agent defers the overflow to the next tick.
- **(3)** No write to unlisted channels — the agent MUST NOT post to any Telegram channel that the user has not explicitly listed as a target in the first-run config.

### 4. Skills & tools used

- Telegram MTProto client (e.g. TDLib, Pyrogram, Telethon) — required. Used for read operations on source channels (view posts, view attachments, view reactions) and for write operations on target channels (post a new message, forward an attachment by reference). The MTProto client is configured to refuse any "download media" call so the no-attachment-download rule is preserved.
- Web search / fetch — optional. Used when the user asks "what is this about" on a specific source post, to enrich the rewrite with a one-line public context.
- Zapier MCP — required for delivery of the per-batch audit recap to Slack or email (Telegram Saved Messages delivery is handled directly by the MTProto client).
- Composio — optional alternative to Zapier for the same delivery actions.
- Slack MCP — required if Slack is the delivery channel.
- Gmail MCP — required if email is the delivery channel.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "auto read news from a designated Telegram channel → translate / rewrite to another language → post to another channel" pattern, intentionally built on top of the read-only MTProto foundation from the group-monitoring and DM-recap use cases and explicitly limited to owned target channels with a per-channel throttle to stay within Telegram's TOS. Pairs with the DM recap for the personal-assistant counterpart, with the RSS-to-social use case for the RSS-feed-only alternative, and with the industry news digest for the public-web counterpart.

### 7. Author (optional)

kent
