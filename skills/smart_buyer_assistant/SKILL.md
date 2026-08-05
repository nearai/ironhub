---
name: smart-buyer-assistant
version: "1.0.0"
description: "Scouts various e-commerce platforms (Google Shopping, Amazon, eBay, Walmart, Best Buy, etc.) for products, extracts detailed specs and user reviews, and monitors deals or price drops."
use_cases:
  - Find the best online prices and available merchants for a specific product
  - Compare product specifications and inspect user reviews from online stores
  - Scrape e-commerce landing pages to verify stock status and pricing details
value_prop: "Automates product research and deal hunting across global marketplaces (Amazon, eBay, Walmart, Best Buy, and Google Shopping) by extracting clean markdown pages."
value_tags:
  - Shopping
  - E-Commerce
  - Research
  - WebScraping
activation:
  keywords:
    - "shopping"
    - "buy"
    - "deal"
    - "price"
    - "discount"
    - "cheapest"
    - "amazon"
    - "ebay"
    - "walmart"
    - "best buy"
  patterns:
    - "find the best price for .*"
    - "track price of .*"
    - "is there any deal for .*"
    - "where can i buy .*"
---

# Smart Buyer Assistant

You have access to the **`serper`** (specifically the `shopping` action) and **`jina`** / **`firecrawl`** tools. Use this skill to help users scout for products, analyze prices, extract specifications, and verify stock availability.

This assistant supports multi-platform e-commerce price monitoring and product detail crawling across popular global marketplaces, including **Amazon**, **eBay**, **Walmart**, **Best Buy**, and search aggregators like **Google Shopping**.

> **Important**: This skill does NOT save data to external databases like Airtable. All findings should be output to the user as clean, beautifully formatted Markdown tables.

---

## Actions at a Glance

| Tool | Action | Use When | Key Params |
|------|--------|----------|------------|
| `serper` | `shopping` | Query Google Shopping listings for prices, merchants, and ratings | `q`, `gl`, `hl` |
| `serper` | `search` | General web search for product reviews or blog comparisons | `q`, `gl`, `hl` |
| `jina` | `read_url` | Extract clean markdown from a product detail page (e.g. Amazon, BestBuy) | `url` |
| `firecrawl` | `scrape` | Alternative extraction method for JavaScript-heavy stores | `url`, `wait_for` |

---

## Decision Flowchart

```
User wants to buy/research a product?
    │
    ├── Wants to find prices & sellers? → serper (action: shopping)
    │
    ├── Wants to read user reviews/specs from a specific URL?
    │     ├── Standard page? → jina (action: read_url)
    │     └── JS-heavy/delayed rendering page? → firecrawl (action: scrape)
    │
    └── Wants a general review summary? → serper (action: search)
          (then extract top articles using jina/firecrawl)
```

---

## Example Invocations

### 1. Scouting product prices
```json
{
  "action": "shopping",
  "q": "iPhone 17 Pro black",
  "gl": "us",
  "hl": "en"
}
```

### 2. Extracting product specs from a specific URL
```json
{
  "action": "read_url",
  "url": "https://www.bestbuy.com/site/apple-iphone-15-pro-128gb/6525412.p"
}
```

---

## Output Guidelines

When summarizing product research:
1. **Compare Prices**: Present options in a Markdown table sorted by price (ascending).
2. **Detail Specs**: List main specifications in a clean bulleted list.
3. **Sentiment Snapshot**: Summarize user reviews into "Pros" and "Cons" blocks.
4. **Direct Links**: Always provide hyperlinked sources for the user to make a purchase.
