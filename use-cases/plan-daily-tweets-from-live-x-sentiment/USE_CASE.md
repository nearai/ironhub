### 1. Title

Plan daily tweets from live X sentiment

### 2. Example prompt

Browse X for the latest $NEAR market sentiment, check what CT is talking about, and give me tweet ideas that match my profile around NEAR, Ironclaw, NEAR Merch, and community culture.

### 3. What the agent does

The agent searches X for recent posts mentioning $NEAR, NEAR Protocol, NEAR AI, NEAR Intents, and related ecosystem keywords. It groups the conversation into sentiment buckets such as bullish, bearish, neutral, meme-driven, builder-focused, and product/news-driven.

Then it checks market context using a crypto data source, summarizes the strongest narratives, and filters out spam, low-quality engagement bait, and repetitive tweets. Based on the user’s profile, tone, past topics, and audience, it generates tweet angles such as market commentary, meme hooks, merch/community posts, Ironclaw updates, and educational threads.

Finally, it gives the user a ready-to-post tweet planner with 5–10 tweet ideas, suggested hooks, hashtags/cashtags, timing notes, and a short explanation of why each idea fits the current sentiment.

### 4. Skills & tools used

- X Search / Social Listening Tool — Required by this use case Needed to browse recent X posts, search cashtags, filter high-engagement posts, and detect live sentiment. Reference: https://docs.x.com/x-api/posts/search-recent-posts If not available in Ironhub, create a skill that connects to the X API recent search endpoint and returns posts, engagement stats, author info, timestamps, and links.
- Crypto Market Data Tool — Required by this use case Needed to fetch current $NEAR price, 24h change, volume, market cap, and trend context. Reference: https://docs.coingecko.com/
- NEAR Ecosystem Research Tool — Required by this use case Needed to verify NEAR-specific news, docs, ecosystem terms, and product context before generating tweets. Reference: https://docs.near.org/
- Profile Memory / Personalization Skill — Required by this use case Needed to understand the user’s usual tweet style, projects, audience, and recurring themes like NEAR Merch, Ironclaw, NEAR Legion, AI, memes, and crypto culture.
- Tweet Drafting / Content Planner Skill — Required by this use case Needed to turn market sentiment into specific tweet ideas, hooks, threads, meme captions, and posting suggestions.

### 5. Categories

- [x] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original Idea

### 7. Author (optional)

hlfbld
