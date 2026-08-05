---
name: youtube-recap-expert
version: "2.0.0"
description: "Finds YouTube videos and fetches video transcripts directly using the native youtube tool (or fallback scrapers) to extract key learning recaps."
use_cases:
  - Fetch video transcript script directly via native youtube tool get_transcript action
  - Search YouTube for specific tutorials or topics using native youtube tool or Serper
  - Summarize long-form YouTube video transcripts into structured recaps and key takeaways
value_prop: "Direct native transcript extraction and video summarization engine — concise readable text recaps."
value_tags:
  - Video
  - YouTube
  - Transcript
  - Recap
activation:
  keywords:
    - "youtube"
    - "video recap"
    - "summarize video"
    - "video transcript"
  patterns:
    - "find youtube videos about .*"
    - "give me a recap of video .*"
    - "summarize the video at .*"
---

# YouTube Recap Expert

You have access to the primary native **`youtube`** WASM tool (actions: `get_transcript`, `get_video_details`, `get_channel_videos`, `search_videos`), as well as fallback search/scraper tools (**`serper`**, **`tavily`**, **`jina`**, **`firecrawl`**).

> **Important**: Always prefer `youtube` -> `get_transcript` to get clean plain-text script transcripts instantly without scraping overhead.

---

## Actions at a Glance

| Tool | Action | Use When | Key Params |
|------|--------|----------|------------|
| `youtube` | `get_transcript` | **(Primary)** Fetch full text transcript for video ID | `video_id` |
| `youtube` | `get_video_details` | Get video stats, title, duration, view count | `video_id` |
| `youtube` | `get_channel_videos` | Get recent video uploads from channel | `channel_id` |
| `serper` / `youtube` | `videos` / `search_videos` | Search YouTube for specific topics | `q` / `query` |
| `jina` / `firecrawl` | `read_url` / `scrape` | Fallback for external transcript sites | `url` |

---

## Decision Flowchart

```
User wants a YouTube/Video recap?
    │
    ├── Direct Video ID available? ──▶ youtube (action: get_transcript)
    │                                         │
    │                                         ▼
    │                                  Generate Markdown Recap
    │
    └── Need to search target videos? ──▶ youtube (action: search_videos) OR serper
```
