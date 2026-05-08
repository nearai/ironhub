# clickup

ClickUp integration tool for the IronClaw agent runtime. Wraps the ClickUp v2 REST API across workspaces, spaces, folders, lists, tasks, task comments, time tracking, goals, and the authenticated user. OAuth 2.0 user-context authentication against app.clickup.com.

## Actions

| Action | Surface | Notes |
|---|---|---|
| `get_authenticated_user` | identity | Returns the authenticated user's id, username, email, color, profile picture. |
| `list_workspaces` | workspaces | The v2 API uses the legacy term `team`; this action surfaces the modern name. |
| `list_spaces` | spaces | Workspace-scoped. Optional `archived` toggle. |
| `get_space` | spaces | Returns statuses, features, and multiple-assignees configuration. |
| `list_folders` | folders | Space-scoped. Optional `archived` toggle. |
| `get_folder` | folders | Includes nested lists. |
| `list_lists` | lists | Folder-scoped. |
| `list_folderless_lists` | lists | Lists that live directly under a space without a folder parent. |
| `get_list` | lists | Returns assignee, due date, priority metadata. |
| `create_list` | lists | Folder-scoped. Optional content, due date, priority, assignee, status. |
| `list_tasks` | tasks | List-scoped with status, assignee, tag, and due-date filters. |
| `list_filtered_team_tasks` | tasks | Workspace-scoped cross-list filter. The exec workhorse. |
| `get_task` | tasks | Optional `custom_task_ids` for human-readable IDs (requires `workspace_id`). |
| `create_task` | tasks | Name plus optional description, assignees, tags, status, priority, due/start dates, parent. |
| `update_task` | tasks | Partial update. Assignees use `assignees_add` and `assignees_rem` for incremental change. |
| `delete_task` | tasks | Hard delete. |
| `add_task_tag` | tasks | Tag must already exist on the parent space. |
| `remove_task_tag` | tasks | Removes the tag association without deleting the tag. |
| `list_task_comments` | comments | Cursor pagination via `start` (timestamp ms) and `start_id`. |
| `create_task_comment` | comments | Optional assignee for accountability comments. |
| `update_comment` | comments | Edit body, reassign, or mark resolved. |
| `delete_comment` | comments | Hard delete. |
| `list_time_entries` | time tracking | Workspace-scoped with date range, assignee, and location filters. |
| `get_running_time_entry` | time tracking | The currently running timer for the authenticated user (or any assignee). |
| `list_goals` | goals | Workspace-scoped. Optional include-completed toggle. |
| `get_goal` | goals | Returns key results and progress. |

## Authentication

OAuth 2.0 user-context against `app.clickup.com`. ClickUp's OAuth implementation is non-standard:

- Authorization URL: `https://app.clickup.com/api` (not `/oauth/authorize`).
- Token URL: `https://api.clickup.com/api/v2/oauth/token`. Accepts JSON or form-encoded body.
- No `scope` parameter. The issued token grants the consenting user's full account authority.
- No PKCE support.
- Tokens do not expire and no refresh tokens are issued. Re-authentication is required only when the user revokes the app from their ClickUp Settings.

The host injects `Authorization: Bearer <token>` on `api.clickup.com/api/v2/` requests. The WASM tool never sees the raw token.

### Setup

1. Sign in to <https://app.clickup.com> and open Settings, Apps, ClickUp API for the workspace that will host the integration.
2. Create OAuth App. Set Name (e.g. `IronClaw ClickUp Tool`) and Redirect URL `http://localhost:9876/callback`.
3. Save the app. Copy the Client ID into `CLICKUP_OAUTH_CLIENT_ID` and the Client Secret into `CLICKUP_OAUTH_CLIENT_SECRET`.
4. Export the client id and secret on the IronClaw host (or write them to `~/.ironclaw/.env`):

   ```sh
   export CLICKUP_OAUTH_CLIENT_ID=...
   export CLICKUP_OAUTH_CLIENT_SECRET=...
   ```

5. Run `ironclaw tool auth clickup`. A browser opens to the consent screen, the callback lands on `localhost:9876`, and the host stores the token.

## Inputs

The schema is derived from the `ClickupAction` tagged enum in `src/types.rs` via `schemars` and surfaced through the `schema()` Guest function. The agent discovers the action surface by calling `tool_info`.

## Identifier shapes

ClickUp identifiers are short alphanumeric strings (`abc123`), not numeric. Every `*_id` parameter is a `String`. The exception is `assignee` and member IDs, which are user-account integers.

For tasks, ClickUp also exposes a "custom task ID" (CTI) format like `CU-123`. To address a task by its CTI rather than its native id, set `custom_task_ids: true` and pass the workspace id via `workspace_id`. The v2 API treats the workspace id as `team_id` on the wire; the tool handles the rename.

## Workspace vs team

The v2 API uses `/team` as the workspace endpoint root. The tool exposes `list_workspaces` for clarity but reads from `/team`. Path parameters that the API names `team_id` are surfaced as `workspace_id` in tool inputs.

## Out of scope (v1)

Custom field manipulation, view CRUD, webhook CRUD, attachment upload, checklist item editing, dependency and task-link management, guest management, user group/role/seat administration, task templates. The manifest format leaves room to add these later without breaking changes.

## Build

```sh
cargo build --release --target wasm32-wasip2
```

Produces `target/wasm32-wasip2/release/clickup_tool.wasm`. Install into IronClaw by copying that file plus `clickup-tool.capabilities.json` into `~/.ironclaw/tools/`.

## License

Dual MIT and Apache-2.0. See the repository root for license files.
