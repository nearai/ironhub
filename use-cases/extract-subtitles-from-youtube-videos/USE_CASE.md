### 1. Title

Extract subtitles from YouTube videos

### 2. Example prompt

"Download just the English subtitles from this YouTube video as an SRT file, without downloading the video itself."

### 3. What the agent does

Uses yt-dlp to pull subtitle tracks from YouTube (and thousands of other video platforms) without downloading the video. Supports both manually uploaded subtitles and YouTube's auto-generated captions. The agent accepts a video URL and outputs a subtitle file in the format and language the user specifies.

Users can control:
- **Language** — any language code (e.g. `en`, `es`, `ja`), or grab all available tracks at once
- **Format** — SRT, VTT, or ASS/SSA
- **Caption type** — prefer manual subtitles, fall back to auto-generated, or request auto-generated only
- **Timestamp stripping** — output clean plain text for use in notes, RAG pipelines, or summaries

Common workflow: extract subtitles → feed the SRT into a downstream agent step (summarize, translate, search by keyword, or index for retrieval).

Install with `pip install yt-dlp`. No API key or account required for public videos.

### 4. Skills & tools used

- yt-dlp — feature-rich video downloader with first-class subtitle extraction; supports `--write-subs`, `--write-auto-subs`, `--sub-langs`, `--sub-format`, and `--skip-download` to grab only the subtitle file (https://github.com/yt-dlp/yt-dlp)
- File write — saves the resulting subtitle file to disk

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

https://github.com/yt-dlp/yt-dlp

### 7. Author (optional)

mr.potato
