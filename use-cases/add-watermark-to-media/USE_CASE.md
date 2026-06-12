### 1. Title

Add watermark to media

### 2. Example prompt

"Add my logo as a watermark to the bottom-right corner of this image at 50% opacity."

### 3. What the agent does

Applies a text or image watermark on top of an existing image, GIF, or video using the watermark.py library — a Python wrapper around FFmpeg. The agent accepts a source file and a watermark (either an image file or a text string), then configures placement, size, and opacity before writing the output.

Users can control:
- **Position** — top-left, top-right, bottom-left, bottom-right, or center
- **Opacity** — how transparent the watermark appears over the base media
- **Scale** — how large the watermark renders relative to the source

Install with `pip install watermark.py` and ensure `ffmpeg` is available on the system. Then hand the agent a file path and describe where and how to stamp it.

### 4. Skills & tools used

- watermark.py — Python/FFmpeg wrapper that stamps image, GIF, or video files with a configurable image watermark (https://github.com/aahnik/watermark.py)
- File read/write — reads the source media file and writes the watermarked output

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [x] Design / media
- [ ] Skill creation

### 6. Source (optional)

https://github.com/aahnik/watermark.py

### 7. Author (optional)

mr.potato
