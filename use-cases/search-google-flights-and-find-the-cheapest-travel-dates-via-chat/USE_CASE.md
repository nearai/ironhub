### 1. Title

Search Google Flights and find the cheapest travel dates via chat

### 2. Example prompt

"Find me the cheapest non-stop economy flights from JFK to LHR in October, and also tell me which dates next month are cheapest to fly from NYC to Paris."

### 3. What the agent does

Connects to Google Flights via the fli MCP tool (no scraping — direct API access through reverse engineering). Searches one-way or round-trip flights with full filter support: cabin class, stops, departure time window, airline preference, and sort order. Can also scan a flexible date range to surface the cheapest travel days, making it easy to optimize for price without manually checking every date on Google Flights.

Install the MCP server once with `pipx install flights`, then run `fli-mcp` and connect it to the agent. After that, just ask in plain English.

### 4. Skills & tools used

- fli MCP tool (search_flights) — searches flights on a specific date with filters for cabin class, stops, airlines, departure window, and sort order (https://github.com/punitarani/fli)
- fli MCP tool (search_dates) — scans a date range and returns the cheapest travel days for one-way or round-trip flights (https://github.com/punitarani/fli)

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

https://github.com/punitarani/fli

### 7. Author (optional)

mr.potato
