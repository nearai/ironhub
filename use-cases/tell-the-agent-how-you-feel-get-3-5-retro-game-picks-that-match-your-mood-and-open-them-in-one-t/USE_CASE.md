### 1. Title

Tell the agent how you feel, get 3-5 retro game picks that match your mood, and open them in one tap to play in the browser — no install, no ROM

### 2. Example prompt

I'm wired and need a quick adrenaline hit — recommend 3-5 retro games that match, and give me a one-tap link I can open in my browser to play right now. Cross-device, no install.

### 3. What the agent does

The agent builds an always-on picture of the user's current mood. On every request, it pulls recent context from the last few chat messages and any journal entries, then combines that with whatever the user just said (free text, emoji, or both) to infer the mood. The agent then searches a catalog of retro and retro-style games (pre-seeded metadata: title, era, platform, genre, mood signals, difficulty, typical session length, web-playable URL) and, if the catalog feels thin or the user wants something newer, augments the result set with a fresh web pull via the Web search or Brave Search API for current web-playable retro or retro-style releases. The agent then returns 3-5 picks, each with: a one-line description, a short "why this matches your mood" explanation, an estimated session length (15-minute pick-me-up vs 2-hour deep dive), and a direct browser-play URL that works on both desktop and mobile (e.g. an HTML5 port on an emulator archive site, an official web release from GOG or the publisher, or an indie web release on itch.io). Each URL is verified live by the agent so it does not send the user to a dead link. The user can ask for a new roll at any time, narrow the recommendation (e.g. "only NES-era", "only co-op", "under 20 minutes"), or re-roll until the picks fit. The agent can also surface a "play now" deep link so the user can open the game in a single tap on whatever device is in front of them. No installs, no ROMs — the agent uses only its catalog and the web search tool, keeping the flow lightweight.

### 4. Skills & tools used

- Web search / fetch — required. Used to verify that the web-playable URL is live and to discover newly released retro-style web games.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "retro game play by mood" idea. Pairs naturally with the mood-aware movie and anime recommender as a sibling for "what to do tonight" recommendations, but kept in its own file because the recommendation space and the legal / distribution model (web-playable links, no installs) are distinct from movie / anime.

### 7. Author (optional)

kent
