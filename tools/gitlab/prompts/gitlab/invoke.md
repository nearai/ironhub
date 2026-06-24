# GitLab invoke

Call this capability with a single `action` field plus that action's fields, all inside `params`. The input schema is a tagged union keyed on `action`; pick one action name and supply only the fields the schema lists for it.

## Actions

- Current user: `current_user`
- Projects: `list_projects`, `get_project`, `create_project`
- Issues: `list_issues`, `get_issue`, `create_issue`, `update_issue`, `list_issue_notes`, `create_issue_note`
- Merge requests: `list_merge_requests`, `get_merge_request`, `create_merge_request`, `update_merge_request`, `list_mr_notes`, `create_mr_note`, `approve_merge_request`, `merge_merge_request`
- Branches: `list_branches`, `get_branch`, `create_branch`, `delete_branch`
- Files: `get_file_content`, `create_or_update_file`, `delete_file`
- Search: `search_projects`, `search_issues`, `search_blobs`
- Pipelines: `list_pipelines`, `get_pipeline`, `list_jobs`

## Parameter notes

- `project`: pass the numeric project ID as a string. To turn a `group/repo` path into an ID, call `search_projects` first.
- Branch names are bare strings (`main`, `feature/x`), with no `refs/heads/` prefix.
- File paths in `get_file_content` and `create_or_update_file` are repository paths from the repo root, with no leading slash.

## Auth

Authentication is host-injected. The host attaches the GitLab OAuth bearer token to each request; do not pass any token, header, or credential field in `params`.
