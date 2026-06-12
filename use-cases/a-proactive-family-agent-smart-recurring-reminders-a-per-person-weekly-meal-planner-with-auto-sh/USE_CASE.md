### 1. Title

A proactive family agent: smart recurring reminders, a per-person weekly meal planner with auto shopping list, and a per-child bedtime story generator that gets better the more you use it

### 2. Example prompt

Be my family's proactive assistant — keep track of our shared reminders (anniversaries, school pickups, recurring meds), plan weekly meals for each of us based on our tastes and dietary needs with a shopping list, and generate a fresh bedtime story for my kid every night that matches their age and interests. Send everything to the channel each of us uses.

### 3. What the agent does

On first run the agent builds a family profile by asking the user:
- **(1)** who is in the family — names, roles (adult / child / elderly), and the channel each person uses for notifications (one channel per person, picked from Slack, Telegram, or email).
- **(2)** For reminders: the user adds a shared family calendar of recurring and one-off items — anniversaries, school events, medication times, recurring chores, bill due dates — and can also set context-aware reminders that fire on a condition (e.g. "remind me to buy milk when the receipt shows fewer than 2 cartons left this week", wired into the invoice-stream use case, or "remind the kids to do homework every weekday at 4pm"). Reminders are family-shared by default — anything marked shared shows up in a single family channel plus each member's individual channel; anything marked private goes only to the owner.
- **(3)** For the meal planner: the agent creates a per-member profile with dietary needs (vegan, halal, kosher, allergies, low-sodium, etc.), taste preferences (spicy / mild / sweet, favorite cuisines, dislikes), and any notes (e.g. "picky eater, will not eat fish"). On a weekly cadence (user picks the day and time) the agent generates a 7-day meal plan with breakfast / lunch / dinner for each family member, respects all dietary constraints, reuses what is already in the fridge when possible (cross-references recent grocery receipts from the invoice / receipt use cases), and balances variety week over week. The plan is delivered to the family's shared channel and to each member's individual channel. From the plan the agent auto-builds a shopping list grouped by aisle / category and sends it to the channel the user picks. The user can give feedback after any meal ("kid refused the fish tonight" / "spice level was perfect for me") and the agent updates each profile's taste model so future plans get more accurate.
- **(4)** For the bedtime story generator: the agent keeps a per-child profile (name, age, favorite characters, themes like "dragons and kindness", preferred length — short ~5 min or longer ~15 min, any fears to avoid).

Every night at the user-set bedtime the agent generates a fresh, original bedtime story tailored to that child and sends it to the parent's channel. Sibling story series are supported — the agent can keep a continuing storyline across nights if the parent wants. Output is text returned in chat, and a notification is pushed to the channel the parent picks (Slack, Telegram, or email) so the parent can read it aloud or forward it. The agent learns over time from feedback ("too scary", "loved the talking turtle — more animals like that", "shorter tonight, she's tired") and quietly tightens its generation per child. Across all three sub-domains the agent is proactive — it pushes the meal plan and shopping list on schedule, fires recurring and context-aware reminders, and delivers the bedtime story without being asked — and the user can talk to it any time to adjust plans, add or remove a family member, or change a profile.

### 4. Skills & tools used

- Zapier MCP — required. Connects Gmail (for email delivery and for receipt cross-reference) and the chosen delivery channels (Slack "Send Channel Message", Telegram "Send Message", Gmail "Send Email"). Also useful for syncing the shared family calendar to Google Calendar.
- Google Calendar MCP — optional but recommended. Used to mirror shared family reminders into a real shared calendar so other family members can see them in their own calendar app.
- Slack MCP — required if any family member uses Slack as their channel.
- Telegram MCP — required if any family member uses Telegram as their channel.
- Composio — optional alternative to Zapier for any of the delivery, calendar, or email actions.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's "Proactive family / personal life agent — reminders, meal planner, bedtime story generator, fitness coach that learns your patterns over time" pattern. The fitness-coach sub-domain is intentionally out of scope here and is left as a follow-on use case.

### 7. Author (optional)

kent
