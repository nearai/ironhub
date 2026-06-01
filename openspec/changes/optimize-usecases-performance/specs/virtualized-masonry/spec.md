## ADDED Requirements

### Requirement: Viewport-only Rendering
The showcase browser SHALL only render the use case card elements that are within or close to the active browser viewport.

#### Scenario: Scroll down the grid
- **WHEN** user scrolls past the first row of cards
- **THEN** cards that exit the viewport are unmounted and replaced with spacers, and new cards entering the viewport are mounted

### Requirement: Debounced Search Filtering
The showcase search input SHALL debounce user keystrokes before performing query filtering.

#### Scenario: Rapid typing
- **WHEN** user types "Slack integration" rapidly
- **THEN** the search query is only evaluated after 150ms of user inactivity, preventing multiple intermediate re-renders
