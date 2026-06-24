# monday.com invoke

Call this capability to read from and write to monday.com through its API v2 (GraphQL).

Pass an `action` field naming the operation, plus that action's fields, in `params`.
The input schema is a tagged union keyed on `action`; only the fields for the chosen
action are accepted.

## Read actions

- `me` - the current account and authenticated user.
- `list_boards` - boards, optionally filtered by workspace, state, or kind.
- `get_board` - a single board by `board_id`.
- `list_groups` - groups on a board.
- `items_by_board` - items on one or more boards, cursor-paginated.
- `get_item` - a single item by `item_id`.
- `search_items_by_column` - items on a board matching column values.
- `list_updates` - updates posted on an item.
- `list_users` - account users, optionally filtered by kind.
- `list_workspaces` - workspaces, optionally filtered by kind.

## Write actions

- `create_item` - create an item on a board.
- `update_item_column_values` - change multiple column values on an item.
- `archive_item` - archive an item.
- `delete_item` - delete an item.
- `move_item_to_group` - move an item to a different group.
- `create_group` - create a group on a board.
- `create_subitem` - create a subitem under a parent item.
- `create_update` - post an update on an item.

## Escape hatch

- `monday_graphql_query` - run any query or mutation against api.monday.com/v2,
  bounded by the same host allowlist and token scope.

monday GraphQL returns HTTP 200 even on errors; the tool inspects the response
`errors` array and surfaces failures as tool errors.

Authentication is handled by the host: a personal API v2 token is injected into the
Authorization header as its raw value (no Bearer prefix, per monday.com's convention).
Do not pass any token in params.
