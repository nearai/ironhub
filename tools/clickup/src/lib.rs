mod api;
mod clickup;
mod types;

use types::ClickupAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct ClickupTool;

impl exports::near::agent::tool::Guest for ClickupTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        match execute_inner(&req.params) {
            Ok(result) => exports::near::agent::tool::Response {
                output: Some(result),
                error: None,
            },
            Err(e) => exports::near::agent::tool::Response {
                output: None,
                error: Some(e),
            },
        }
    }

    fn schema() -> String {
        let schema = schemars::schema_for!(types::ClickupAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "ClickUp integration via the v2 REST API. Workspaces (list_workspaces), spaces \
         (list_spaces, get_space), folders (list_folders, get_folder), lists (list_lists, \
         list_folderless_lists, get_list, create_list), tasks (list_tasks, \
         list_filtered_team_tasks, get_task, create_task, update_task, delete_task, \
         add_task_tag, remove_task_tag), comments (list_task_comments, create_task_comment, \
         update_comment, delete_comment), time tracking (list_time_entries, \
         get_running_time_entry), goals (list_goals, get_goal), and the authenticated user \
         (get_authenticated_user). OAuth 2.0 user-context authentication against \
         app.clickup.com. ClickUp v2 calls workspaces \"teams\"; this tool surfaces the \
         current name."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: ClickupAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("clickup-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for clickup tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: get_authenticated_user, list_workspaces, list_spaces, get_space, list_folders, get_folder, list_lists, list_folderless_lists, get_list, create_list, list_tasks, list_filtered_team_tasks, get_task, create_task, update_task, delete_task, add_task_tag, remove_task_tag, list_task_comments, create_task_comment, update_comment, delete_comment, list_time_entries, get_running_time_entry, list_goals, get_goal. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("ClickUp action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        ClickupAction::GetAuthenticatedUser => api::get_authenticated_user()?,
        ClickupAction::ListWorkspaces => api::list_workspaces()?,
        ClickupAction::ListSpaces {
            workspace_id,
            archived,
        } => api::list_spaces(&workspace_id, archived)?,
        ClickupAction::GetSpace { space_id } => api::get_space(&space_id)?,
        ClickupAction::ListFolders { space_id, archived } => {
            api::list_folders(&space_id, archived)?
        }
        ClickupAction::GetFolder { folder_id } => api::get_folder(&folder_id)?,
        ClickupAction::ListLists {
            folder_id,
            archived,
        } => api::list_lists(&folder_id, archived)?,
        ClickupAction::ListFolderlessLists { space_id, archived } => {
            api::list_folderless_lists(&space_id, archived)?
        }
        ClickupAction::GetList { list_id } => api::get_list(&list_id)?,
        ClickupAction::CreateList {
            folder_id,
            name,
            content,
            due_date,
            due_date_time,
            priority,
            assignee,
            status,
        } => api::create_list(&api::CreateListRequest {
            folder_id: &folder_id,
            name: &name,
            content: content.as_deref(),
            due_date,
            due_date_time,
            priority,
            assignee,
            status: status.as_deref(),
        })?,
        ClickupAction::ListTasks {
            list_id,
            archived,
            page,
            order_by,
            reverse,
            subtasks,
            statuses,
            include_closed,
            assignees,
            tags,
            due_date_gt,
            due_date_lt,
        } => api::list_tasks(&api::ListTasksRequest {
            list_id: &list_id,
            archived,
            page,
            order_by: order_by.as_deref(),
            reverse,
            subtasks,
            statuses: &statuses,
            include_closed,
            assignees: &assignees,
            tags: &tags,
            due_date_gt,
            due_date_lt,
        })?,
        ClickupAction::ListFilteredTeamTasks {
            workspace_id,
            page,
            order_by,
            reverse,
            subtasks,
            space_ids,
            project_ids,
            list_ids,
            statuses,
            include_closed,
            assignees,
            tags,
            due_date_gt,
            due_date_lt,
            date_created_gt,
            date_created_lt,
            date_updated_gt,
            date_updated_lt,
        } => api::list_filtered_team_tasks(&api::ListFilteredTeamTasksRequest {
            workspace_id: &workspace_id,
            page,
            order_by: order_by.as_deref(),
            reverse,
            subtasks,
            space_ids: &space_ids,
            project_ids: &project_ids,
            list_ids: &list_ids,
            statuses: &statuses,
            include_closed,
            assignees: &assignees,
            tags: &tags,
            due_date_gt,
            due_date_lt,
            date_created_gt,
            date_created_lt,
            date_updated_gt,
            date_updated_lt,
        })?,
        ClickupAction::GetTask {
            task_id,
            custom_task_ids,
            workspace_id,
            include_subtasks,
        } => api::get_task(
            &task_id,
            custom_task_ids,
            workspace_id.as_deref(),
            include_subtasks,
        )?,
        ClickupAction::CreateTask {
            list_id,
            name,
            description,
            assignees,
            tags,
            status,
            priority,
            due_date,
            due_date_time,
            start_date,
            start_date_time,
            notify_all,
            parent,
        } => api::create_task(&api::CreateTaskRequest {
            list_id: &list_id,
            name: &name,
            description: description.as_deref(),
            assignees: &assignees,
            tags: &tags,
            status: status.as_deref(),
            priority,
            due_date,
            due_date_time,
            start_date,
            start_date_time,
            notify_all,
            parent: parent.as_deref(),
        })?,
        ClickupAction::UpdateTask {
            task_id,
            custom_task_ids,
            workspace_id,
            name,
            description,
            status,
            priority,
            due_date,
            due_date_time,
            start_date,
            start_date_time,
            assignees_add,
            assignees_rem,
            archived,
        } => api::update_task(&api::UpdateTaskRequest {
            task_id: &task_id,
            custom_task_ids,
            workspace_id: workspace_id.as_deref(),
            name: name.as_deref(),
            description: description.as_deref(),
            status: status.as_deref(),
            priority,
            due_date,
            due_date_time,
            start_date,
            start_date_time,
            assignees_add: &assignees_add,
            assignees_rem: &assignees_rem,
            archived,
        })?,
        ClickupAction::DeleteTask {
            task_id,
            custom_task_ids,
            workspace_id,
        } => api::delete_task(&task_id, custom_task_ids, workspace_id.as_deref())?,
        ClickupAction::AddTaskTag {
            task_id,
            tag_name,
            custom_task_ids,
            workspace_id,
        } => api::add_task_tag(
            &task_id,
            &tag_name,
            custom_task_ids,
            workspace_id.as_deref(),
        )?,
        ClickupAction::RemoveTaskTag {
            task_id,
            tag_name,
            custom_task_ids,
            workspace_id,
        } => api::remove_task_tag(
            &task_id,
            &tag_name,
            custom_task_ids,
            workspace_id.as_deref(),
        )?,
        ClickupAction::ListTaskComments {
            task_id,
            custom_task_ids,
            workspace_id,
            start,
            start_id,
        } => api::list_task_comments(
            &task_id,
            custom_task_ids,
            workspace_id.as_deref(),
            start,
            start_id.as_deref(),
        )?,
        ClickupAction::CreateTaskComment {
            task_id,
            comment_text,
            assignee,
            notify_all,
            custom_task_ids,
            workspace_id,
        } => api::create_task_comment(
            &task_id,
            &comment_text,
            assignee,
            notify_all,
            custom_task_ids,
            workspace_id.as_deref(),
        )?,
        ClickupAction::UpdateComment {
            comment_id,
            comment_text,
            assignee,
            resolved,
        } => api::update_comment(&comment_id, &comment_text, assignee, resolved)?,
        ClickupAction::DeleteComment { comment_id } => api::delete_comment(&comment_id)?,
        ClickupAction::ListTimeEntries {
            workspace_id,
            start_date,
            end_date,
            assignees,
            include_task_tags,
            include_location_names,
            space_id,
            folder_id,
            list_id,
            task_id,
        } => api::list_time_entries(&api::ListTimeEntriesRequest {
            workspace_id: &workspace_id,
            start_date,
            end_date,
            assignees: &assignees,
            include_task_tags,
            include_location_names,
            space_id: space_id.as_deref(),
            folder_id: folder_id.as_deref(),
            list_id: list_id.as_deref(),
            task_id: task_id.as_deref(),
        })?,
        ClickupAction::GetRunningTimeEntry {
            workspace_id,
            assignee,
        } => api::get_running_time_entry(&workspace_id, assignee)?,
        ClickupAction::ListGoals {
            workspace_id,
            include_completed,
        } => api::list_goals(&workspace_id, include_completed)?,
        ClickupAction::GetGoal { goal_id } => api::get_goal(&goal_id)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &ClickupAction) -> &'static str {
    match action {
        ClickupAction::GetAuthenticatedUser => "get_authenticated_user",
        ClickupAction::ListWorkspaces => "list_workspaces",
        ClickupAction::ListSpaces { .. } => "list_spaces",
        ClickupAction::GetSpace { .. } => "get_space",
        ClickupAction::ListFolders { .. } => "list_folders",
        ClickupAction::GetFolder { .. } => "get_folder",
        ClickupAction::ListLists { .. } => "list_lists",
        ClickupAction::ListFolderlessLists { .. } => "list_folderless_lists",
        ClickupAction::GetList { .. } => "get_list",
        ClickupAction::CreateList { .. } => "create_list",
        ClickupAction::ListTasks { .. } => "list_tasks",
        ClickupAction::ListFilteredTeamTasks { .. } => "list_filtered_team_tasks",
        ClickupAction::GetTask { .. } => "get_task",
        ClickupAction::CreateTask { .. } => "create_task",
        ClickupAction::UpdateTask { .. } => "update_task",
        ClickupAction::DeleteTask { .. } => "delete_task",
        ClickupAction::AddTaskTag { .. } => "add_task_tag",
        ClickupAction::RemoveTaskTag { .. } => "remove_task_tag",
        ClickupAction::ListTaskComments { .. } => "list_task_comments",
        ClickupAction::CreateTaskComment { .. } => "create_task_comment",
        ClickupAction::UpdateComment { .. } => "update_comment",
        ClickupAction::DeleteComment { .. } => "delete_comment",
        ClickupAction::ListTimeEntries { .. } => "list_time_entries",
        ClickupAction::GetRunningTimeEntry { .. } => "get_running_time_entry",
        ClickupAction::ListGoals { .. } => "list_goals",
        ClickupAction::GetGoal { .. } => "get_goal",
    }
}

export!(ClickupTool);
