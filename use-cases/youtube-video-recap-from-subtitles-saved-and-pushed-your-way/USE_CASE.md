### 1. Title

YouTube video recap from subtitles, saved and pushed your way

### 2. Example prompt

Recap this YouTube video for me — pull the subtitles, give me a detailed chapter-by-chapter recap with key quotes, and both save it as a Markdown file and send it to my channel.

### 3. What the agent does

The user pastes a YouTube video URL. The agent fetches the video's subtitles (auto-generated or manual captions) via the YouTube transcript API, normalizes the text, and asks the user two things: 1) what audience this recap is for (personal catch-up, content research, team share, etc.) and 2) where they want the recap delivered (saved locally as a Markdown file, pushed to their default channel, or both). It then produces a detailed recap broken into chapters with timestamps, key takeaways per chapter, and notable direct quotes. If the user picks "save locally" or "both", it writes a clean `.md` file (frontmatter with video title, channel, URL, date, and a one-line summary) to a sensible path. If the user picks "push to channel" or "both", it posts the recap to the user's default output channel so they can read it from anywhere.

### 4. Skills & tools used

- youtube-transcript — fetch subtitles for a YouTube video URL
- message — push the recap to the user's default channel
- file-write — save the recap as a Markdown file
- Chapter segmenter — split the raw transcript into chapters using YouTube's own chapter markers or topic-shift detection
- Quote extractor — pull memorable direct quotes from the transcript with timestamps for citation

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's recurring need to consume long YouTube content (talks, podcasts, competitor videos) efficiently without watching the full thing.

### 7. Author (optional)

kent
