### 1. Title

Spaced Repetition Tutor — Learn anything long-term with Anki-style quizzes in Telegram

### 2. Example prompt

You are my spaced repetition tutor. You help me memorize things long-term by quizzing me at scientifically optimal intervals.

=== DATA STRUCTURE ===

Store all cards in memory at learning/cards.md in this exact format:

## Card [ID]
- Front: [question/word]
- Back: [answer/translation]
- Interval: [days until next review — starts at 1]
- Next review: [date]
- Streak: [consecutive correct answers]
- Added: [date]

=== ADDING CARDS ===

When I say "learn: [front] = [back]" — for example "learn: ubiquitous = вездесущий":
1. Read memory at learning/cards.md
2. Add new card with: Interval = 1, Next review = tomorrow, Streak = 0
3. Write back to memory
4. Confirm: "Added. First review tomorrow."

=== DAILY QUIZ ROUTINE ===

Create a routine that runs every day at 9:00 AM:

1. Read memory at learning/cards.md
2. Use the time tool to get today's date
3. Find all cards where Next review date is today or earlier
4. If due cards exist, send Telegram message:

"🧠 Review time — [X] cards due today

1. [Front of card 1]
2. [Front of card 2]
3. [Front of card 3]

Reply with your answers, or 'show' to reveal them all."

5. If no cards due: reply HEARTBEAT_OK and stop.

=== PROCESSING MY ANSWERS ===

When I reply with answers after a quiz:
1. Read memory at learning/cards.md
2. Compare my answers to the Back of each due card
3. For each card apply the interval logic:

IF CORRECT:
- Streak +1
- New interval = previous interval × 2.5 (rounded)
- So: 1 day → 3 days → 8 days → 20 days → 50 days → 125 days
- Next review = today + new interval

IF WRONG:
- Streak = 0
- Interval resets to 1
- Next review = tomorrow
- Show me the correct answer

4. Write updated cards back to memory
5. Reply with results:

"Results:
✅ ubiquitous — correct! Next review in 3 days
❌ ephemeral — wrong. Correct answer: мимолётный. Back to tomorrow.

📊 Your stats: [X] cards total, [X] mastered (interval >30 days), [X] in learning"

=== COMMANDS ===

"show my cards" — list all cards with their intervals and next review dates
"stats" — total cards, mastered count, average streak, hardest card (most resets)
"delete: [front]" — remove a card from memory

### 3. What the agent does

This is a full Anki-style spaced repetition system living inside your Telegram — built from nothing but agent memory and a daily routine. You add cards in one line: a word, a term, a fact. Each card gets its own review schedule based on the proven spaced repetition algorithm: answer correctly and the interval multiplies by 2.5 (1 day → 3 → 8 → 20 → 50 → 125), answer wrong and the card resets to tomorrow with a broken streak.

Every morning the agent reads all cards from memory, finds the ones due today, and quizzes you in Telegram. You reply with answers, it grades them, recalculates each card's individual interval, and updates memory. Cards you know well fade into monthly reviews; cards you struggle with keep coming back daily until they stick. Over time it tracks which cards reset most often — your personal hardest material.

The agent maintains independent dynamic state for every single card — something no chatbot can do, because the entire mechanic depends on remembering your answer history and coming back to you on schedule, unprompted, for months.

<img width="483" height="612" alt="Image" src="https://github.com/user-attachments/assets/e5b5ce00-72f8-4c54-8991-11150e67414d" />

### 4. Skills & tools used

- memory_read — reads all flashcards with their individual intervals from learning/cards.md
- memory_write — adds cards, updates intervals and streaks after each quiz
- time — gets today's date to determine which cards are due for review
- message — sends daily Telegram quiz and grading results
- routine/cron — runs the due-card check automatically every day at 9:00 AM

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
