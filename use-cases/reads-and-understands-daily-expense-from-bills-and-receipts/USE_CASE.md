### 1. Title

reads and understands daily expense from bills and receipts

### 2. Example prompt

I uploaded today’s food, travel, and shopping bills. Read the receipt images, record the expenses, categorize them, and tell me how much I spent this week.

### 3. What the agent does

The agent accepts uploaded receipt or bill images, extracts merchant name, date, total amount, tax, payment method, and line items using OCR. It asks for clarification only when the image is unreadable or the total amount is uncertain.

Then it records each expense into a personal finance tracker such as a spreadsheet, database, Notion table, or expense app. It automatically categorizes spending into buckets like food, transport, shopping, subscriptions, business, crypto/tools, travel, and miscellaneous.

After logging the expenses, it gives the user a short summary: total spend, top categories, unusual expenses, missing receipt details, and remaining budget for the week or month. Over time, it can generate weekly/monthly finance reports and flag spending patterns.

### 4. Skills & tools used

- Receipt OCR / Image-to-Text Skill — Needed to read uploaded receipt and bill images and extract text, totals, dates, merchant names, and item details. Reference: https://docs.cloud.google.com/vision/docs/ocr If not available in Ironhub, create a skill using Google Cloud Vision OCR, Mindee Receipt OCR, or another document OCR service.
- Receipt Parsing Skill — Needed to convert raw OCR text into structured fields like merchant, date, currency, subtotal, tax, total, category, and payment method. Reference: https://www.mindee.com/product/receipt-ocr-api
- Expense Database / Spreadsheet Tool — Needed to save every expense into a structured tracker with columns such as date, merchant, category, amount, currency, notes, receipt image link, and payment method. Reference: https://developers.google.com/sheets/api
- Budget Analysis Skill — Needed to summarize spending by week, month, category, merchant, and budget limit.

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [x] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original Idea

### 7. Author (optional)

hlfbld
