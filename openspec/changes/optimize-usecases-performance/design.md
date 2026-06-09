## Context

The current Use Cases page parses the entire `usecases.json` file and sends the full array to the client. This will degrade initial load speed (large HTML payload) and client responsiveness (stuttering filters and large DOM trees) when the dataset grows to 500+ items.

## Goals / Non-Goals

**Goals:**
- Implement a paginated REST API endpoint (`/api/usecases`) that handles filtering, search, and chunking on the server.
- Optimize client-side search filtering using input debouncing.
- Reduce DOM complexity using viewport-only virtualization.

**Non-Goals:**
- Migrating the data storage from a local JSON file to an external database (e.g., PostgreSQL or SQLite) is out of scope. We will keep using `usecases.json` as the source of truth.

## Decisions

### 1. In-Memory JSON Cache on the Server
- **Decision**: Read and parse `usecases.json` once, then cache the array in-memory inside the Next.js API route handler.
- **Rationale**: Reading and parsing a 500-item JSON file from disk on every single request adds disk I/O overhead. Caching it in-memory delivers sub-millisecond API response times.
- **Alternative Considered**: Database storage. Rejected for now because the deployment environment (Railway/Serverless) is simpler without managing separate databases.

### 2. Client-side Search Debouncing
- **Decision**: Delay updating the search state by 150ms after the last keypress.
- **Rationale**: Prevents expensive search filtering computations on every single keystroke.

### 3. Lightweight Custom Intersection Observer for Virtualization
- **Decision**: Implement viewport-only rendering using a basic React intersection observer hook on the masonry items.
- **Rationale**: Avoids adding complex external virtualization libraries (like `react-window`) which can have issues integrating with CSS columns/masonry layouts.
- **Alternative Considered**: Standard grid virtualization libraries. Rejected because they require fixed row heights, whereas usecase cards have variable heights.

## Risks / Trade-offs

- **Memory Leak risk**: In-memory caching needs to handle hot-reloads properly in dev mode.
  - *Mitigation*: Store the cache on `globalThis` during development.
- **SEO crawlability**: If the page renders paginated/client-side loaded content, search engines might miss cards past page 1.
  - *Mitigation*: Ensure the first page (top 15 cards) is server-side rendered (SSR) so crawlers index the key entries immediately.
