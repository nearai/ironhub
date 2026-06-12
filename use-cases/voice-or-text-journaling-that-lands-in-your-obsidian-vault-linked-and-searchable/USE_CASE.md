### 1. Title

Voice or text journaling that lands in your Obsidian vault, linked and searchable

### 2. Example prompt

I just had a long talk with my co-founder about our Q3 roadmap — record it as a journal entry, link it to my existing "Q3 planning" note, and pull it up later when I ask "what did we decide about pricing last month?"

### 3. What the agent does

The user talks or types. If it's voice, the agent sends the audio to NEAR AI's private `openai/whisper-large-v3` endpoint at https://cloud.near.ai/models/openai/whisper-large-v3 for transcription — no third-party cloud, audio never leaves NEAR AI infrastructure. The agent then asks two setup questions on the first run: 1) where to save (which Obsidian vault or local Markdown folder, e.g. `~/Documents/ObsidianVault/Journal/`) and 2) how much structure per entry (minimal: just timestamp + tags, standard: title + date + tags + mood + 1-line summary, or full: standard + key insights + action items + linked entities). The agent remembers the choice and applies it to every future entry. On every save, it auto-tags from the content, detects recurring entities (people, projects, companies, ideas), and inserts Obsidian wiki-links `[[like-this]]` to any existing note that matches.

Every night it generates a short daily digest entry that links out to the day's journal notes. The user can retrieve entries by exact keyword (filename or in-note text) or by semantic query ("the conversation I had with my co-founder about Q3 pricing").

### 4. Skills & tools used

- NEAR AI Whisper STT — `openai/whisper-large-v3` at https://cloud.near.ai/models/openai/whisper-large-v3 for private voice-to-text
- file-write — append the structured Markdown entry to the user's vault
- grep — fast keyword / in-note search across the vault
- Obsidian-linker — detect matching existing note titles in the vault and insert `[[wiki-links]]`
- Daily-digest generator — produce a nightly summary entry that links to the day's journal notes
- Entity extractor — pull people, projects, and companies from entries into a registry so the linker can resolve them consistently

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's idea of a voice-first or text journaling assistant that structures entries into Obsidian / Markdown with links, insights, and retrieval — with the hard requirement that voice data stays on private infrastructure via NEAR AI's hosted Whisper model.

### 7. Author (optional)

kent
