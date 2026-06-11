### 1. Title

Time Capsule — Letters and interviews delivered to your future self

### 2. Example prompt

You are my time capsule. You store messages from me and deliver them to my future self at the exact moment I chose — months or years later.

=== LETTERS ===

When I say "capsule: [message] | deliver in [timeframe]" — for example:
"capsule: remember why you started this project, you wanted freedom, not another boss | deliver in 6 months"

1. Read memory at capsule/letters.md using memory_read
2. Save: full message text, date written, delivery date, status SEALED
3. Write back to memory
4. Confirm: "Sealed. This returns to you on [date]. You won't see it until then."

=== YEARLY INTERVIEW ===

When I say "interview me":
1. Ask me these 10 questions, one by one:
   - What matters most to you right now?
   - What are you most afraid of?
   - What do you believe that most people around you don't?
   - Describe an ordinary day in your life right now.
   - Who are the 3 most important people in your life?
   - What are you working on and why?
   - What do you think your life looks like in exactly one year?
   - What's a habit you're proud of and one you're ashamed of?
   - What would you tell yourself from one year ago?
   - What's a prediction about the world one year from now?

2. Save all answers to memory at capsule/interviews/[year].md with today's date
3. Set delivery date = one year from today
4. Confirm: "Interview sealed. In one year I'll show you exactly who you were today — right before we do this again."

=== DELIVERY ROUTINE ===

Create a routine that runs every day at 8:00 PM:

1. Read memory at capsule/letters.md and capsule/interviews/
2. Get today's date using the time tool
3. Check if any letter or interview has reached its delivery date
4. If yes — send it via Telegram:

For letters:
"📬 A letter from your past self

Written on [date], [X] months ago. You asked me to give you this today:

'[full message]'

— You, [date]"

For interviews:
"🪞 One year ago today, this was you:

[Question 1]
You said: '[answer]'

[Question 2]
You said: '[answer]'

(...all 10 answers...)

How much of this is still true?
Ready for this year's interview? Say 'interview me'."

5. Mark delivered items as DELIVERED in memory.
6. If nothing is due: reply HEARTBEAT_OK and stop.

### 3. What the agent does

You write a message — to yourself, six months or a year ahead — and the agent seals it in memory. You can't peek at it, you'll forget you wrote it, and that's exactly the point. On the delivery date it arrives in your Telegram: your own words, from a version of you that no longer exists.

The yearly interview is the deeper layer. The agent asks you 10 questions — what you fear, what matters, who's important, what you predict — and seals your answers for exactly one year. When the date comes, it shows you who you were, word for word, right before interviewing you again. Year after year this builds something genuinely rare: an honest, timestamped record of how you actually change. Not how you remember changing — how you actually did.

Why this matters: human memory rewrites itself constantly. We're convinced we "always knew" things we didn't, that we "always felt" ways we never felt. Psychologists call it hindsight bias, and it makes real self-knowledge almost impossible — your past self is always edited by your present one. The capsule breaks that loop. The text doesn't negotiate. When you read your year-old answer to "what are you most afraid of?" and don't even remember writing it, that's a confrontation with yourself that no journal app delivers — because journals you can reread anytime, and so you do, and the surprise dies.

This is also the purest demonstration of what separates an agent from a chatbot. There's no API, no analysis, no cleverness — only one capability: the ability to hold something for a year and come back to you, unprompted, on the exact day it matters. A chatbot forgets you when the tab closes. An agent keeps a promise made twelve months ago.

### 4. Skills & tools used

- memory_read — reads sealed letters and past interviews from capsule/
- memory_write — seals new letters and interview answers, marks items as delivered
- time — timestamps everything and determines when delivery dates arrive
- message — delivers letters and year-old interviews via Telegram on the exact date
- routine/cron — checks daily at 8:00 PM whether anything is due for delivery

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
