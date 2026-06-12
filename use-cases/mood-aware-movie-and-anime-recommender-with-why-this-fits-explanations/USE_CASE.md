### 1. Title

Mood-aware movie and anime recommender with "why this fits" explanations

### 2. Example prompt

I'm feeling a bit drained tonight — suggest 3–5 movies or anime that match the mood, and tell me why each one fits.

### 3. What the agent does

The agent builds an always-on picture of the user's current mood. On every request, it pulls recent context from the last few chat messages and any journal entries, then combines that with whatever the user just said (free text, emoji, or both) to infer the mood. It then searches a catalog of popular movies and anime (pre-seeded metadata: plots, tags, genres, mood signals) and, if the catalog feels thin, augments the result set with a fresh web pull via the Web search or Brave Search API for currently-trending or region-relevant titles. The user's "where to watch" region is set during first-run setup. It re-ranks candidates with a local LLM for best mood fit, returns 3–5 picks (default mix of movies + anime, user can override per request), and for each title gives a warm one-line "why this matches your mood" reason plus the year, genres, a short teaser, the rating, and a "where to watch" hint. The agent remembers every pick the user likes, skips, or finishes, and uses that history to refine future suggestions. Optional extras like a pixel-art mood poster for the pick are available on request.

### 4. Skills & tools used

- web-search — Brave Search API pull for fresh / trending titles when the local catalog is thin
- tmdb — movie metadata, ratings, and "where to watch" hints
- anilist — rich anime metadata, tags, and mood signals
- Local LLM ranker — re-rank candidates by mood fit and write the empathetic "why this fits" blurb
- Mood inferrer — fuse recent chat + journal + current text into one mood signal
- Pixel-art poster skill (optional) — generate a mood poster for the chosen title

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [x] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's brief for `mood-movie-anime-recommender` (a.k.a. `vibe-watch-suggester`): a daily-utility, local-first recommender that turns a vague feeling into 3–5 well-explained picks, learns taste over time, and is built to feel delightful on a Mac M4.

### 7. Author (optional)

kent
