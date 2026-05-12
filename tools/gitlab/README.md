# gitlab

GitLab integration tool for the IronClaw agent runtime. Wraps the GitLab v4 REST API across projects, issues, merge requests, branches, files, search, pipelines, and the current user. OAuth 2.0 user-context authentication against gitlab.com.

## Actions

| Action | Surface | Notes |
|---|---|---|
| `current_user` | profile | Returns the authenticated user's id, username, name, email. |
| `list_projects` | projects | Membership-scoped by default. Optional search filter. |
| `get_project` | projects | Accepts numeric id or URL-encoded `group/project` slug. |
| `create_project` | projects | Visibility defaults to `private`. README initialization on by default. |
| `list_issues` | issues | Filter by state (`opened`, `closed`, `all`). |
| `get_issue` | issues | Per-project internal id (`iid`), not global id. |
| `create_issue` | issues | Optional labels and assignee ids. |
| `update_issue` | issues | Any of title, description, state_event (close, reopen), labels. |
| `list_issue_notes` | issues | Comments on an issue. |
| `create_issue_note` | issues | Add a comment. |
| `list_merge_requests` | merge requests | Filter by state. |
| `get_merge_request` | merge requests | Per-project `iid`. |
| `create_merge_request` | merge requests | Source and target branches must exist before the call. |
| `update_merge_request` | merge requests | Any of title, description, state_event, target_branch. |
| `list_mr_notes` | merge requests | Comments on a merge request. |
| `create_mr_note` | merge requests | Add a comment. |
| `approve_merge_request` | merge requests | Approval by the authenticated user. |
| `merge_merge_request` | merge requests | Optional commit message, squash, source branch removal. |
| `list_branches` | branches | Optional name filter. |
| `get_branch` | branches | Returns commit metadata and protection state. |
| `create_branch` | branches | Branches off an existing `ref` (branch, tag, or commit sha). |
| `delete_branch` | branches | Hard delete. Protected branches return 403. |
| `get_file_content` | files | Returns base64 content plus size in bytes. |
| `create_or_update_file` | files | Detects existence on the target branch and dispatches POST or PUT accordingly. |
| `delete_file` | files | Records a deletion commit on the target branch. |
| `search_projects` | search | Global project search. |
| `search_issues` | search | Project-scoped issue search. |
| `search_blobs` | search | Project-scoped code search. |
| `list_pipelines` | pipelines | Optional status and ref filters. |
| `get_pipeline` | pipelines | Pipeline by numeric id. |
| `list_jobs` | pipelines | Jobs in a given pipeline. |

## Authentication

OAuth 2.0 user-context with PKCE against `gitlab.com`. The host exchanges the authorization code for an access and refresh token pair, stores them encrypted, and injects `Authorization: Bearer <token>` on `gitlab.com/api/v4/` requests. The WASM tool never sees the raw token.

### Setup

1. Sign in to <https://gitlab.com> and go to <https://gitlab.com/-/profile/applications>.
2. Under Add new application set Name (e.g. `IronClaw GitLab Tool`) and Redirect URI `http://localhost:9876/callback`.
3. Check Confidential. Under Scopes select `api` and `read_user`.
4. Save the application. Copy the Application ID into `GITLAB_OAUTH_CLIENT_ID` and the Secret into `GITLAB_OAUTH_CLIENT_SECRET`.
5. Export the client id and secret on the IronClaw host (or write them to `~/.ironclaw/.env`):

   ```sh
   export GITLAB_OAUTH_CLIENT_ID=...
   export GITLAB_OAUTH_CLIENT_SECRET=...
   ```

6. Run `ironclaw tool auth gitlab`. A browser opens to the consent screen, the callback lands on `localhost:9876`, and the host stores the tokens. Refresh tokens are rotated automatically; re-authentication is required only when scopes change or consent is revoked.

## Inputs

The schema is derived from the `GitlabAction` tagged enum in `src/types.rs` via `schemars` and surfaced through the `schema()` Guest function. The agent discovers the action surface by calling `tool_info`.

## Project identifiers

`project` accepts either the numeric project id or the URL-encoded path (`group%2Fproject` or just `group/project` — the tool handles encoding). The same parameter shape works across every project-scoped action.

## Issue and merge request ids

The `iid` parameter is the per-project internal id surfaced in the GitLab UI (`#42`), not the global numeric id. Every issue/MR action takes `iid` for consistency with what users see and copy from URLs.

## Self-hosted GitLab

Out of scope for v1. The tool hard-codes `gitlab.com` as the API host. Self-hosted support requires a parameterized base URL and matching allowlist entries.

## Build

```sh
cargo build --release --target wasm32-wasip2
```

Produces `target/wasm32-wasip2/release/gitlab_tool.wasm`. Install into IronClaw by copying that file plus `gitlab-tool.capabilities.json` into `~/.ironclaw/tools/`.

## License

Dual MIT and Apache-2.0. See the repository root for license files.
