### 1. Title

Daily inbox summarizer with reply drafts and to-dos, delivered where you work

### 2. Example prompt

Every morning, summarize my inbox, flag what needs a reply, and post the digest (with draft replies for the urgent ones) to the channel I pick.

### 3. What the agent does

On first run it asks the user which email accounts to connect (Gmail, Outlook, IMAP, or all of them) and which channel should receive the daily digest (Slack, Telegram, Signal, or email reply). It stores those preferences.

Every morning it pulls the last 24 hours of mail from each connected account, deduplicates threads, scores each message by urgency and topic, and produces a concise digest: 1) a short top-level summary, 2) a "needs reply" list with a one-line context per thread and a ready-to-send draft reply for the urgent ones, 3) a to-do list of action items extracted from the messages (dates, owners, follow-ups). It posts the digest to the user's chosen channel so the user can scan it in under 2 minutes, copy a draft, reply, or mark the to-do done.

### 4. Skills & tools used

- gmail — read Gmail inbox
- outlook — read Outlook / Microsoft 365 mail
- imap — connect any IMAP mailbox
- routine/cron — schedule the daily run
- message — post the digest to the user's chosen channel
- slack — deliver to a Slack channel or DM
- telegram — deliver to a Telegram chat
- Thread deduplicator — collapse long reply chains into one entry
- Reply drafter — generate short, on-tone draft replies from message context
- Action extractor — pull dates, owners, follow-ups, and to-dos out of message bodies

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's recurring need to triage a multi-account inbox quickly and act on it from one place.

### 7. Author (optional)

kent
