### 1. Title

Turn every new podcast episode into a week's worth of content — show notes, quote graphics, social clips, and a ready-to-send email newsletter — automatically

### 2. Example prompt

Every time a new episode of my podcast drops, give me a tight transcript, draft the show notes, pull out the best quotes for graphics, draft 3-5 social clips, and a ready-to-send email newsletter. Drop everything in my main channel and let me pick what I want to keep.

### 3. What the agent does

On first run the agent asks the user:
- **(1)** the source of new episodes — any combination of podcast RSS (the user pastes the show's RSS URL and the agent watches for new items), YouTube (the agent watches a channel or playlist for new uploads — YouTube subtitle download is only available on a local self-hosted IronClaw because YouTube blocks cloud / VPS IPs, so this option is gated behind a self-host setup check), and manual upload (the user drops an MP3 / WAV file into the agent through any connected chat channel).
- **(2)** How to get the transcript — the agent tries the cheapest path first: if the RSS enclosure includes a transcript URL, the agent pulls that directly; if the YouTube upload has subtitles and the user is on a local self-hosted IronClaw, the agent pulls those; otherwise the agent runs Whisper transcription on the audio.
- **(3)** Which outputs to generate (the user can pick any combination — show notes is on by default; quote graphics prompts, social clips, and email newsletter are optional add-ons). Show notes are a 5–10 bullet summary with chapter markers and timestamps, quote graphics are 5–10 pull-quotes each paired with an image-generation prompt (for Midjourney, DALL-E, or a designer), social clips are 3–5 short posts formatted per platform (Twitter / X thread, LinkedIn post, Instagram caption), and the email newsletter is a ready-to-send HTML or plain-text draft with a one-line subject, preview text, intro, key takeaways, and a CTA.
- **(4)** The default delivery channel — the user is asked to confirm which channel the agent should drop new episode outputs into, defaulting to the channel the user is most active in. From there the user can also opt into a Notion database (one row per episode with all outputs as fields), a Google Drive folder (one folder per episode, with show_notes.md, quotes.md, clips.md, newsletter.md as separate files), or just the in-channel summary.
- **(5)** Whether to push a one-line notification to the channel the moment an episode finishes processing, or stay silent and let the user pull.

These preferences are stored. On every new episode the agent pulls the audio or transcript from the configured source, runs Whisper if needed, and produces the enabled outputs in parallel. Each output is written into the chosen destination and a one-line notification is sent if the user opted in.

The user can at any time ask the agent to regenerate a specific output ("give me a punchier version of the show notes", "draft 3 more quote graphics", "rewrite the newsletter in a more casual tone"), change the RSS feed, swap delivery channel, or add a new output type.

### 4. Skills & tools used

- Whisper transcription — required for any source that does not ship a transcript (manual audio upload, podcast RSS without an enclosure transcript, or YouTube on cloud where subtitles cannot be pulled).
- Zapier MCP — required for the YouTube watch trigger (new uploads on a channel or playlist), for the delivery channels (Slack "Send Channel Message", Telegram "Send Message", Gmail "Send Email"), and for writing to Notion or Google Drive.
- Notion MCP — optional but recommended when Notion is the destination.
- Google Drive MCP — optional but recommended when the user picks the folder-per-episode destination.
- Local self-hosted IronClaw — required for the YouTube subtitle path only, because YouTube blocks cloud / VPS IPs from downloading subtitles. Cloud IronClaw users can still use the RSS transcript path, the manual audio upload path, and Whisper transcription — they just cannot pull YouTube subtitles.

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Podcast Episode Auto-Repurpose — turns 1 hour recording into a week of content" pattern, with an explicit hosting note: the YouTube subtitle path only works on a local self-hosted IronClaw because YouTube blocks cloud / VPS IPs. Cloud IronClaw users get the RSS transcript path, manual audio upload, and Whisper transcription. Pairs with the RSS-to-social use case for a feed-only alternative and with the industry news digest for a research-side companion.

### 7. Author (optional)

kent
