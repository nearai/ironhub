---
name: local-business-lead-generator
version: "1.0.0"
description: "Harvests local business leads from Google Maps, scrapes their websites for contact emails, and formats them into a clean prospect list."
use_cases:
  - Find local business directories (address, phone, rating) for outreach target categories
  - Extract email addresses and key contact details from business websites
  - Aggregate local business search data into clean markdown tables
value_prop: "Automates lead prospecting and data enrichment, generating target lists directly."
value_tags:
  - LeadGen
  - Prospecting
  - Marketing
  - Scraping
activation:
  keywords:
    - "lead"
    - "business"
    - "contact"
    - "directory"
    - "maps"
    - "outreach"
    - "lead list"
  patterns:
    - "find leads for .*"
    - "scrape businesses in .*"
    - "gather contact info of .*"
---

# Local Business Lead Generator

You have access to the **`serper`** (specifically the `places` action) and **`jina`** / **`firecrawl`** tools. Use this skill to help users search local maps data for prospective clients, crawl their websites, and extract contact details (such as emails or social links).

> **Important**: This skill does NOT save data to external databases like Airtable. All structured leads must be written as a clean Markdown table in your final response.

---

## Actions at a Glance

| Tool | Action | Use When | Key Params |
|------|--------|----------|------------|
| `serper` | `places` | Search for local businesses by keyword and location | `q`, `gl`, `hl` |
| `jina` | `read_url` | Extract text from a business website home or contact page | `url` |
| `firecrawl` | `scrape` | Scrape JavaScript-heavy business websites | `url`, `wait_for` |

---

## Decision Flowchart

```
User wants B2B leads in a local area?
    │
    ├── Query Google Maps for businesses? → serper (action: places)
    │
    └── Enrich websites for emails/contacts?
          ├── Standard site? → jina (action: read_url)
          └── Delayed rendering site? → firecrawl (action: scrape)
```

---

## Example Invocations

### 1. Finding local businesses in Boston
```json
{
  "action": "places",
  "q": "dental clinics in Boston MA"
}
```

### 2. Extracting contact info from a website
```json
{
  "action": "read_url",
  "url": "https://www.bostondentalclinic.com/contact-us"
}
```

---

## Lead Extraction Workflow

1. **Locate Targets**: Run `serper` with `action: "places"` to query the niche and location (e.g. `dental clinics in Boston MA`).
2. **Filter Website links**: Extract the list of domains/websites from the places result. Ignore places without websites.
3. **Scrape Contact pages**: For the top results, use `jina` or `firecrawl` to query their `/contact`, `/about`, or homepage URLs. Look for:
   - Email addresses (e.g., regex `[\w\.-]+@[\w\.-]+\.\w+`).
   - Phone numbers.
   - Social media profile links (Facebook, Instagram, LinkedIn).
4. **Compile Lead Sheet**: Format everything into a Markdown table with the following columns: `Business Name`, `Address`, `Phone`, `Website`, `Email`, `Social Links`, `Rating`.
