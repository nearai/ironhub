## ADDED Requirements

### Requirement: Paginated Use Cases Retrieval
The system SHALL expose a GET endpoint at `/api/usecases` that accepts `page` and `limit` query parameters and returns paginated use case entries.

#### Scenario: Request first page
- **WHEN** user requests `/api/usecases?page=1&limit=15`
- **THEN** system returns JSON with the first 15 usecase items and pagination metadata (totalCount, hasMore)

### Requirement: Filtered Use Cases by Category
The system SHALL accept a `category` query parameter at the `/api/usecases` endpoint and return only entries matching that category.

#### Scenario: Filter by Dev Tools
- **WHEN** user requests `/api/usecases?category=Dev Tools`
- **THEN** system returns only use cases that belong to "Dev Tools"

### Requirement: Full-text Search
The system SHALL accept a `q` query parameter at the `/api/usecases` endpoint and return entries matching the search query in their title, description, prompt, or tools.

#### Scenario: Search for Binance
- **WHEN** user requests `/api/usecases?q=Binance`
- **THEN** system returns only use cases matching "Binance"
