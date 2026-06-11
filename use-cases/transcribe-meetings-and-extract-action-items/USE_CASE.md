### 1. Title

Transcribe meetings and extract action items

### 2. Example prompt

Here's the recording from today's product sync. Transcribe it, pull out decisions and action items with owners, and push to notion/notes app.

### 3. What the agent does

Ingests the audio or video file, transcribes the full meeting with speaker labels and timestamps, then scans the transcript to surface decisions made, open questions, and action items with assigned owners and due dates where mentioned. It produces two outputs: a clean meeting summary doc with a timestamped timeline of key moments, and a structured action-item list. It then creates corresponding tickets in the user's task manager (google tasks, notion, docs, notes), tagging the right owner and linking back to the timestamp in the transcript for context.

### 4. Skills & tools used

- Audio/video transcription skill (Whisper-based or similar speech-to-text with speaker diarization) — ref — Reference: https://github.com/openai/whisper
- Meeting summarizer skill (decisions + action items extraction template) — Required by this use case.
- Notion/GoogleDoc/Google Tasks Access — Required by this use case.
- Google Drive or local file read tool for ingesting the recording — Required by this use case.
- Document export (Markdown / Google Docs / Notion) — Required by this use case.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

halfblood
