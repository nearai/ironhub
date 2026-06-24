Use this capability to call the ClickUp v2 REST API. Pass an `action` field naming the operation, plus that action's fields, in `params`. The input schema is a tagged union keyed on `action`; consult it for the exact fields each action takes.

Supported actions:
- Workspaces: `list_workspaces`
- Spaces: `list_spaces`, `get_space`
- Folders: `list_folders`, `get_folder`
- Lists: `list_lists`, `list_folderless_lists`, `get_list`, `create_list`
- Tasks: `list_tasks`, `list_filtered_team_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`, `add_task_tag`, `remove_task_tag`
- Comments: `list_task_comments`, `create_task_comment`, `update_comment`, `delete_comment`
- Time tracking: `list_time_entries`, `get_running_time_entry`
- Goals: `list_goals`, `get_goal`
- Identity: `get_authenticated_user`

ClickUp v2 calls workspaces "teams"; `list_workspaces` surfaces the current name. Authentication is host-injected; the agent never handles the token. Returns the raw ClickUp API JSON for the action.
