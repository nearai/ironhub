---
name: api-caller
version: 1.0.0
description: Structure, format, and debug API requests and responses across REST, GraphQL, and RPC protocols
activation:
  keywords:
    - "api call"
    - "api request"
    - "rest api"
    - "graphql"
    - "fetch request"
    - "http request"
    - "call this endpoint"
    - "api response"
    - "json request"
    - "curl"
  patterns:
    - "(?i)(make|build|structure|format).*(api|http|rest|graphql).*(call|request)"
    - "(?i)(call|hit|query).*(endpoint|api|url)"
    - "(?i)(post|get|put|delete|patch).*(request|endpoint|api)"
  tags:
    - "dev"
    - "api"
    - "integration"
  max_context_tokens: 2000
---

# API Caller Skill

Helps the agent correctly structure, format, execute, and debug API requests across REST, GraphQL, and RPC protocols.

## When to Use

- User wants to call an external API
- User needs help formatting headers, body, or auth
- User is debugging a failed API request
- User wants to integrate a service (Plaid, CoinGecko, NEAR RPC, OpenAI, etc.)

## Core Knowledge

### Key Principles

1. **Method matters** — GET for reading, POST for creating, PUT/PATCH for updating, DELETE for removing
2. **Auth first** — always establish the authentication method before building the request
3. **Validate the response** — always check status code, then parse the body
4. **Handle errors** — every API call must have error handling for 4xx and 5xx responses

### Request Structure

```
Method: GET | POST | PUT | PATCH | DELETE
URL: https://api.example.com/endpoint
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body (POST/PUT): { "key": "value" }
```

### Auth Patterns

| Auth Type | How to Apply |
|-----------|-------------|
| API Key | Header: `X-API-Key: key` or query param |
| Bearer Token | Header: `Authorization: Bearer token` |
| Basic Auth | Header: `Authorization: Basic base64(user:pass)` |
| OAuth 2.0 | Exchange code for token, then use Bearer |

### Common APIs

- **CoinGecko**: `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- **NEAR RPC**: `POST https://rpc.mainnet.near.org` with JSON-RPC body
- **OpenAI**: `POST https://api.openai.com/v1/chat/completions` with Bearer token

### Mistakes to Avoid

- Never hardcode API keys in code — use environment variables
- Don't ignore rate limits — check the API docs for limits and add retry logic
- Don't assume success — always check `response.ok` or status code

## Guidelines

- Always provide a complete working code snippet (JS fetch, Python requests, or curl)
- Include error handling in every example
- If the user's API key is visible, remind them to keep it secret
- For NEAR RPC specifically, use JSON-RPC 2.0 format
