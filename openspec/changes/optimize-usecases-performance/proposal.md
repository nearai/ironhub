## Why

As the Use Cases showcase grows to 500+ entries, the current client-side filtering approach causes page performance issues, including large HTML serialization payloads, masonry layout reflow lag, and search input stutter on low-end mobile devices.

## What Changes

- **Server-Side API Route**: Introduce a new Next.js API route (`/api/usecases`) that serves paginated, searchable, and category-filtered use case entries from `usecases.json`.
- **Search Debouncing**: Implement debounced state management for the showcase search input to prevent expensive refiltering computations on every keystroke.
- **Masonry Virtualization**: Adopt a virtualized list/grid rendering approach inside the masonry component to only render cards within the current viewport.

## Capabilities

### New Capabilities
- `usecases-api`: REST API route supporting pagination, full-text search, and category-based filtering query parameters.
- `virtualized-masonry`: Performance-optimized masonry rendering that displays only cards within the active viewport.

### Modified Capabilities
<!-- None. No existing core spec requirements are changed. -->

## Impact

- `app/usecases/page.tsx`: Shift initial load from SSR full payload to a simple page that queries the new API route or SSRs only the first page.
- `features/showcase/components/showcase-browser.tsx`: Integrate the new API route fetching logic, query parameters, search debouncing, and virtualized container.
- `lib/usecases/server.ts`: Add helper functions to query, filter, search, and paginate the local JSON dataset on the server side.
