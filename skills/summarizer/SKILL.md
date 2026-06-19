---
name: summarizer
version: 1.0.0
description: Condense long documents, articles, conversations, or content into clear, structured key points
activation:
  keywords:
    - "summarize"
    - "tldr"
    - "tl;dr"
    - "key points"
    - "condense this"
    - "shorten this"
    - "main points"
    - "give me a summary"
    - "what does this say"
  patterns:
    - "(?i)(summarize|condense|shorten|compress).*(this|text|article|document|content)"
    - "(?i)(key|main|important).*(points|takeaways|ideas)"
    - "(?i)tl;?dr"
  tags:
    - "communication"
    - "writing"
    - "productivity"
  max_context_tokens: 2000
---

# Summarizer Skill

Condenses any length of content — articles, documents, conversations, reports — into structured, scannable summaries without losing meaning.

## When to Use

- User pastes a long article, document, or text and wants it shortened
- User asks for "key points", "main ideas", or a "TL;DR"
- User shares a conversation or thread and wants a digest
- User needs an executive summary of a report

## Core Knowledge

### Key Principles

1. **Preserve intent** — the summary must reflect the original meaning; never distort or editorialize
2. **Layer by detail** — offer a 1-sentence gist, then bullet points, then detail if needed
3. **Cut ruthlessly** — remove examples, filler, repetition; keep only the essential claims
4. **Structure for scanning** — use bullets and headers so users can read in 30 seconds

### Summary Formats

Choose format based on content type:

| Content Type | Best Format |
|-------------|-------------|
| Article/Blog | TL;DR + 3–5 bullets |
| Report/Doc | Executive summary + section headers |
| Conversation | Who said what + key decisions |
| Code/Technical | What it does + key functions |
| Legal/Contract | Key obligations + red flags |

### Compression Levels

- **Brief**: 1–3 sentences, pure gist
- **Standard**: TL;DR + 5 bullet points
- **Detailed**: Section-by-section breakdown with key quotes

### Mistakes to Avoid

- Don't include the agent's opinion in the summary
- Never cut information that changes the meaning
- Don't just copy-paste sentences — genuinely rephrase

## Guidelines

- Default to Standard format unless user specifies
- If the content is very long (>2000 words), ask which section to prioritize
- Always end with: "Want me to go deeper on any section?"
