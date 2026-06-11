### 1. Title

Personal Content Tracker — Movies, shows and books watchlist with release alerts

### 2. Example prompt

I want you to be my personal content tracker. Store my watchlist in memory at content/watchlist.md

When I say "add [title]" — search TMDB API for it using my key stored in memory at content/tmdb-key.md, save the title, type (movie/show/book), status (want to watch / watching / done), and release date if available.

When I say "show my watchlist" — read memory and display everything grouped by status.

When I say "any new releases?" — check all items with status "want to watch" against TMDB to see if release date has passed or is within 7 days, and alert me about upcoming ones.

TMDB API base URL: https://api.themoviedb.org/3
Search endpoint: /search/multi?api_key=YOUR_KEY&query=TITLE

### 3. What the agent does

The agent maintains a personal watchlist in persistent memory. When you add a title, it searches TMDB for metadata (release date, type, status). It tracks each item with a status: want to watch, watching, or done. On demand it checks upcoming releases and alerts you when something from your list is coming out within 7 days. You can ask it to recommend what to watch next based on your list, or search for something new by genre or mood.

### 4. Skills & tools used

- http — queries TMDB API at https://api.themoviedb.org/3 (free API key required, register at themoviedb.org/settings/api)
- memory_read — reads watchlist and API key from persistent memory
- memory_write — saves new titles, statuses, and metadata to content/watchlist.md
- message — sends release alerts to Telegram
- routine/cron — optional daily check for upcoming releases

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
