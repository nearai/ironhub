---
name: image-handler
version: 1.0.0
description: Handle images passed as base64 blobs or URLs from Telegram or API and make them accessible to analysis tools
activation:
  keywords:
    - "analyze this image"
    - "look at this chart"
    - "read this screenshot"
    - "check this image"
    - "image analysis"
    - "analyze photo"
    - "read image"
  patterns:
    - "(?i)(analyze|read|look at|check|interpret).*(image|photo|screenshot|chart|picture)"
    - "(?i)(image|photo|screenshot).*(sent|attached|uploaded|shared)"
    - "(?i)(can('t| not)|unable to).*(find|access|read|open).*(image|file|attachment)"
  tags:
    - "image"
    - "vision"
    - "utility"
  max_context_tokens: 2000
---

# Image Handler Skill

Handles images that arrive as base64 blobs (from Telegram or API) or as URLs, decodes them, writes them to a temporary filesystem path, and makes them accessible to any skill that requires a file path (chart-reader, rug-detector screenshots, Polymarket screenshots, etc).

## When to Use

- User sends an image via Telegram and the agent cannot locate the file
- Agent receives an attachment stored in memory rather than on the filesystem
- Any skill reports it cannot find or access an image file
- User asks the agent to analyze a chart, screenshot, or photo

## Core Knowledge

### Key Principles

1. **Images from Telegram are never on disk** — they arrive as `message.photo` objects; always fetch and decode before passing to any tool
2. **Base64 must be decoded first** — never pass raw base64 strings to file-based tools
3. **Temp files are the bridge** — write decoded bytes to `/tmp/` so filesystem-based tools can access them
4. **Always clean up** — delete temp files after analysis to avoid filling disk
5. **URL images can be fetched directly** — no decode step needed, just download the bytes

### Image Sources and How to Handle Each

#### Source 1: Telegram Bot (most common)

Images arrive as `message.photo` — an array of `PhotoSize` objects sorted smallest to largest.

```python
import tempfile
import os
from telegram import Update
from telegram.ext import ContextTypes

async def handle_telegram_image(update: Update, context: ContextTypes.DEFAULT_TYPE) -> str:
    """
    Fetch image from Telegram, save to temp file, return path.
    """
    if not update.message.photo:
        return None

    # Always use the largest resolution
    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)

    # Download as bytes
    image_bytes = await file.download_as_bytearray()

    # Write to temp file
    tmp = tempfile.NamedTemporaryFile(
        suffix=".png",
        delete=False,
        dir="/tmp",
        prefix="ironclaw_img_"
    )
    tmp.write(image_bytes)
    tmp.close()

    return tmp.name  # e.g. /tmp/ironclaw_img_abc123.png
```

#### Source 2: Base64 String (API / webhook)

```python
import base64
import tempfile
import os

def handle_base64_image(base64_string: str) -> str:
    """
    Decode base64 image string, save to temp file, return path.
    """
    # Strip data URI prefix if present (e.g. "data:image/png;base64,...")
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]

    image_bytes = base64.b64decode(base64_string)

    tmp = tempfile.NamedTemporaryFile(
        suffix=".png",
        delete=False,
        dir="/tmp",
        prefix="ironclaw_img_"
    )
    tmp.write(image_bytes)
    tmp.close()

    return tmp.name
```

#### Source 3: Image URL

```python
import requests
import tempfile
import os

def handle_image_url(url: str) -> str:
    """
    Download image from URL, save to temp file, return path.
    """
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    # Detect extension from content-type
    content_type = resp.headers.get("Content-Type", "image/png")
    ext = ".jpg" if "jpeg" in content_type else ".png"

    tmp = tempfile.NamedTemporaryFile(
        suffix=ext,
        delete=False,
        dir="/tmp",
        prefix="ironclaw_img_"
    )
    tmp.write(resp.content)
    tmp.close()

    return tmp.name
```

### Universal Handler (auto-detects source)

```python
def prepare_image(image_input) -> str:
    """
    Auto-detect image source and return a filesystem path.

    Accepts:
      - Telegram PhotoSize object
      - base64 string
      - URL string (http/https)
      - bytes directly

    Returns:
      - Absolute path to temp file e.g. /tmp/ironclaw_img_abc.png
    """
    import base64, tempfile, requests

    # Already bytes
    if isinstance(image_input, (bytes, bytearray)):
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False, dir="/tmp", prefix="ironclaw_img_")
        tmp.write(image_input)
        tmp.close()
        return tmp.name

    if isinstance(image_input, str):
        # URL
        if image_input.startswith("http://") or image_input.startswith("https://"):
            return handle_image_url(image_input)
        # Base64 (with or without data URI prefix)
        return handle_base64_image(image_input)

    return None

def cleanup_image(path: str):
    """Delete temp file after analysis is complete."""
    try:
        if path and os.path.exists(path):
            os.unlink(path)
    except Exception:
        pass
```

### Full Usage Pattern

```python
async def on_message(update, context):
    # 1. Prepare image → get filesystem path
    image_path = await handle_telegram_image(update, context)

    if not image_path:
        await update.message.reply_text("No image found. Please resend.")
        return

    try:
        # 2. Pass path to any analysis skill
        result = chart_reader.analyze(image_path)
        # or: indicator_analyst.analyze(image_path)
        # or: any tool that needs a file path

        await update.message.reply_text(result)

    finally:
        # 3. Always clean up
        cleanup_image(image_path)
```

### Supported Image Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| PNG | .png | Default for screenshots |
| JPEG | .jpg | Common for photos |
| WebP | .webp | Some Telegram images |
| GIF | .gif | Static only — not animated |

### Mistakes to Avoid

- Never pass `file_id` directly to a vision tool — it's a Telegram reference, not a file path
- Don't forget to `await` async Telegram calls — missing await causes silent failures
- Don't hardcode `/tmp/image.png` — use `tempfile` to avoid conflicts when multiple images arrive simultaneously
- Don't skip `cleanup_image()` — temp files accumulate and fill disk over time
- Don't assume all base64 strings are clean — always strip the data URI prefix if present

## Guidelines

- When agent reports "cannot find image file" → immediately apply this skill's `prepare_image()` handler
- Always use the largest available Telegram photo size (`message.photo[-1]`)
- After preparing the image path, pass it to the appropriate analysis skill: `chart-reader`, `indicator-analyst`, or `trend-detector`
- Always wrap analysis in try/finally to guarantee cleanup even if analysis fails
- If image cannot be decoded after two attempts, ask the user to share it as a direct URL instead
