---
name: youtube
version: 0.1.0
description: YouTube Data API v3 integration and video transcript extraction for video metadata, comment sentiment analysis, channel analytics, channel uploads tracking, keyword search, and text transcripts.
use_cases:
  - Fetch video statistics (views, likes, comments, duration) and metadata
  - Extract top-level comment threads and replies for sentiment mining and FAQ extraction
  - Retrieve full text transcript for any video ID via youtube-transcript.ai
  - Retrieve channel metrics (subscribers, total views, video count) and uploads playlist ID
  - Track recent channel video uploads using low-quota 1-unit playlist endpoints
  - Search YouTube for videos, channels, or playlists by query string
value_prop: "Token-optimized YouTube intelligence tool for Ironclaw — fast, structured YAML metrics, comment feeds, and full text transcripts with low-quota design."
value_tags:
  - YouTube
  - Video
  - Transcript
  - Sentiment
  - Comments
  - Analytics
  - Research
---

# YouTube Tool

A sandboxed WASM tool for Ironclaw interfacing with YouTube Data API v3 (`https://www.googleapis.com/youtube/v3`) and `youtube-transcript.ai`.

![YouTube tool](screenshot.jpg)

## Features & Supported Actions

| Action | Description | Base Endpoint | Quota / Rate Limit |
|---|---|---|---|
| `get_video_details` | Fetch metadata, duration, views, likes, comment count for video IDs | `/youtube/v3/videos` | 1 unit |
| `list_comments` | Extract comment threads & replies for video or channel sentiment mining | `/youtube/v3/commentThreads` | 1 unit |
| `get_channel_stats` | Retrieve channel stats (subs, total views) & Uploads playlist ID | `/youtube/v3/channels` | 1 unit |
| `get_channel_videos` | Retrieve recent videos from channel Uploads playlist | `/youtube/v3/playlistItems` | 1 unit |
| `search_videos` | Search videos/channels by keyword query | `/youtube/v3/search` | ⚠️ 100 units |
| `get_transcript` | Fetch full plain-text script transcript for a video ID | `youtube-transcript.ai/transcript/<ID>.txt` | Fair use (~2 req/s) |

## Setup & Credentials

Configure your Google API key (with YouTube Data API v3 enabled) via Ironclaw CLI:

```bash
rtk ironclaw tool setup youtube
```

The credential secret is stored under `youtube_api_key` and injected into YouTube Data API HTTP requests as a query parameter (`?key=...`). The `get_transcript` action requires no key.
