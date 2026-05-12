use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum ClickupAction {
    GetAuthenticatedUser,

    ListWorkspaces,

    ListSpaces {
        workspace_id: String,
        #[serde(default)]
        archived: bool,
    },
    GetSpace {
        space_id: String,
    },

    ListFolders {
        space_id: String,
        #[serde(default)]
        archived: bool,
    },
    GetFolder {
        folder_id: String,
    },

    ListLists {
        folder_id: String,
        #[serde(default)]
        archived: bool,
    },
    ListFolderlessLists {
        space_id: String,
        #[serde(default)]
        archived: bool,
    },
    GetList {
        list_id: String,
    },
    CreateList {
        folder_id: String,
        name: String,
        #[serde(default)]
        content: Option<String>,
        #[serde(default)]
        due_date: Option<i64>,
        #[serde(default)]
        due_date_time: bool,
        #[serde(default)]
        priority: Option<u32>,
        #[serde(default)]
        assignee: Option<u64>,
        #[serde(default)]
        status: Option<String>,
    },

    ListTasks {
        list_id: String,
        #[serde(default)]
        archived: bool,
        #[serde(default = "default_page")]
        page: u32,
        #[serde(default)]
        order_by: Option<String>,
        #[serde(default)]
        reverse: bool,
        #[serde(default)]
        subtasks: bool,
        #[serde(default)]
        statuses: Vec<String>,
        #[serde(default)]
        include_closed: bool,
        #[serde(default)]
        assignees: Vec<u64>,
        #[serde(default)]
        tags: Vec<String>,
        #[serde(default)]
        due_date_gt: Option<i64>,
        #[serde(default)]
        due_date_lt: Option<i64>,
    },
    ListFilteredTeamTasks {
        workspace_id: String,
        #[serde(default = "default_page")]
        page: u32,
        #[serde(default)]
        order_by: Option<String>,
        #[serde(default)]
        reverse: bool,
        #[serde(default)]
        subtasks: bool,
        #[serde(default)]
        space_ids: Vec<String>,
        #[serde(default)]
        project_ids: Vec<String>,
        #[serde(default)]
        list_ids: Vec<String>,
        #[serde(default)]
        statuses: Vec<String>,
        #[serde(default)]
        include_closed: bool,
        #[serde(default)]
        assignees: Vec<u64>,
        #[serde(default)]
        tags: Vec<String>,
        #[serde(default)]
        due_date_gt: Option<i64>,
        #[serde(default)]
        due_date_lt: Option<i64>,
        #[serde(default)]
        date_created_gt: Option<i64>,
        #[serde(default)]
        date_created_lt: Option<i64>,
        #[serde(default)]
        date_updated_gt: Option<i64>,
        #[serde(default)]
        date_updated_lt: Option<i64>,
    },
    GetTask {
        task_id: String,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
        #[serde(default)]
        include_subtasks: bool,
    },
    CreateTask {
        list_id: String,
        name: String,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        assignees: Vec<u64>,
        #[serde(default)]
        tags: Vec<String>,
        #[serde(default)]
        status: Option<String>,
        #[serde(default)]
        priority: Option<u32>,
        #[serde(default)]
        due_date: Option<i64>,
        #[serde(default)]
        due_date_time: bool,
        #[serde(default)]
        start_date: Option<i64>,
        #[serde(default)]
        start_date_time: bool,
        #[serde(default = "default_true")]
        notify_all: bool,
        #[serde(default)]
        parent: Option<String>,
    },
    UpdateTask {
        task_id: String,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
        #[serde(default)]
        name: Option<String>,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        status: Option<String>,
        #[serde(default)]
        priority: Option<u32>,
        #[serde(default)]
        due_date: Option<i64>,
        #[serde(default)]
        due_date_time: Option<bool>,
        #[serde(default)]
        start_date: Option<i64>,
        #[serde(default)]
        start_date_time: Option<bool>,
        #[serde(default)]
        assignees_add: Vec<u64>,
        #[serde(default)]
        assignees_rem: Vec<u64>,
        #[serde(default)]
        archived: Option<bool>,
    },
    DeleteTask {
        task_id: String,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
    },
    AddTaskTag {
        task_id: String,
        tag_name: String,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
    },
    RemoveTaskTag {
        task_id: String,
        tag_name: String,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
    },

    ListTaskComments {
        task_id: String,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
        #[serde(default)]
        start: Option<i64>,
        #[serde(default)]
        start_id: Option<String>,
    },
    CreateTaskComment {
        task_id: String,
        comment_text: String,
        #[serde(default)]
        assignee: Option<u64>,
        #[serde(default = "default_true")]
        notify_all: bool,
        #[serde(default)]
        custom_task_ids: bool,
        #[serde(default)]
        workspace_id: Option<String>,
    },
    UpdateComment {
        comment_id: String,
        comment_text: String,
        #[serde(default)]
        assignee: Option<u64>,
        #[serde(default)]
        resolved: Option<bool>,
    },
    DeleteComment {
        comment_id: String,
    },

    ListTimeEntries {
        workspace_id: String,
        #[serde(default)]
        start_date: Option<i64>,
        #[serde(default)]
        end_date: Option<i64>,
        #[serde(default)]
        assignees: Vec<u64>,
        #[serde(default)]
        include_task_tags: bool,
        #[serde(default)]
        include_location_names: bool,
        #[serde(default)]
        space_id: Option<String>,
        #[serde(default)]
        folder_id: Option<String>,
        #[serde(default)]
        list_id: Option<String>,
        #[serde(default)]
        task_id: Option<String>,
    },
    GetRunningTimeEntry {
        workspace_id: String,
        #[serde(default)]
        assignee: Option<u64>,
    },

    ListGoals {
        workspace_id: String,
        #[serde(default)]
        include_completed: bool,
    },
    GetGoal {
        goal_id: String,
    },
}

fn default_page() -> u32 {
    0
}
fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<ClickupAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_get_authenticated_user_marker_variant() {
        let action = parse(r#"{"action":"get_authenticated_user"}"#).unwrap();
        assert!(matches!(action, ClickupAction::GetAuthenticatedUser));
    }

    #[test]
    fn parse_list_workspaces_marker_variant() {
        let action = parse(r#"{"action":"list_workspaces"}"#).unwrap();
        assert!(matches!(action, ClickupAction::ListWorkspaces));
    }

    #[test]
    fn parse_list_spaces_with_archived() {
        let action =
            parse(r#"{"action":"list_spaces","workspace_id":"abc","archived":true}"#).unwrap();
        match action {
            ClickupAction::ListSpaces {
                workspace_id,
                archived,
            } => {
                assert_eq!(workspace_id, "abc");
                assert!(archived);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_spaces_uses_default_archived_when_omitted() {
        let action = parse(r#"{"action":"list_spaces","workspace_id":"abc"}"#).unwrap();
        match action {
            ClickupAction::ListSpaces { archived, .. } => assert!(!archived),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_task_minimal() {
        let action = parse(r#"{"action":"create_task","list_id":"L1","name":"do thing"}"#).unwrap();
        match action {
            ClickupAction::CreateTask {
                list_id,
                name,
                description,
                assignees,
                tags,
                priority,
                due_date,
                start_date,
                notify_all,
                parent,
                ..
            } => {
                assert_eq!(list_id, "L1");
                assert_eq!(name, "do thing");
                assert!(description.is_none());
                assert!(assignees.is_empty());
                assert!(tags.is_empty());
                assert!(priority.is_none());
                assert!(due_date.is_none());
                assert!(start_date.is_none());
                assert!(notify_all);
                assert!(parent.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_task_full() {
        let raw = r#"{
            "action": "create_task",
            "list_id": "L1",
            "name": "Q3 review",
            "description": "Prep slides for board",
            "assignees": [101, 102],
            "tags": ["board", "q3"],
            "status": "in progress",
            "priority": 2,
            "due_date": 1735689600000,
            "due_date_time": true,
            "start_date": 1735000000000,
            "start_date_time": false,
            "notify_all": false,
            "parent": "T_PARENT"
        }"#;
        let action = parse(raw).unwrap();
        match action {
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
            } => {
                assert_eq!(list_id, "L1");
                assert_eq!(name, "Q3 review");
                assert_eq!(description.as_deref(), Some("Prep slides for board"));
                assert_eq!(assignees, vec![101, 102]);
                assert_eq!(tags, vec!["board", "q3"]);
                assert_eq!(status.as_deref(), Some("in progress"));
                assert_eq!(priority, Some(2));
                assert_eq!(due_date, Some(1735689600000));
                assert!(due_date_time);
                assert_eq!(start_date, Some(1735000000000));
                assert!(!start_date_time);
                assert!(!notify_all);
                assert_eq!(parent.as_deref(), Some("T_PARENT"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_update_task_partial_only_status() {
        let action = parse(r#"{"action":"update_task","task_id":"T1","status":"closed"}"#).unwrap();
        match action {
            ClickupAction::UpdateTask {
                task_id,
                status,
                name,
                description,
                priority,
                due_date,
                due_date_time,
                ..
            } => {
                assert_eq!(task_id, "T1");
                assert_eq!(status.as_deref(), Some("closed"));
                assert!(name.is_none());
                assert!(description.is_none());
                assert!(priority.is_none());
                assert!(due_date.is_none());
                assert!(due_date_time.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_task_with_custom_task_ids() {
        let action = parse(
            r#"{"action":"get_task","task_id":"CU-42","custom_task_ids":true,"workspace_id":"W1"}"#,
        )
        .unwrap();
        match action {
            ClickupAction::GetTask {
                task_id,
                custom_task_ids,
                workspace_id,
                include_subtasks,
            } => {
                assert_eq!(task_id, "CU-42");
                assert!(custom_task_ids);
                assert_eq!(workspace_id.as_deref(), Some("W1"));
                assert!(!include_subtasks);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_filtered_team_tasks_with_arrays() {
        let raw = r#"{
            "action": "list_filtered_team_tasks",
            "workspace_id": "W1",
            "page": 0,
            "assignees": [101, 202],
            "statuses": ["open", "in progress"],
            "list_ids": ["L1", "L2"],
            "include_closed": false
        }"#;
        let action = parse(raw).unwrap();
        match action {
            ClickupAction::ListFilteredTeamTasks {
                workspace_id,
                assignees,
                statuses,
                list_ids,
                include_closed,
                ..
            } => {
                assert_eq!(workspace_id, "W1");
                assert_eq!(assignees, vec![101, 202]);
                assert_eq!(statuses, vec!["open", "in progress"]);
                assert_eq!(list_ids, vec!["L1", "L2"]);
                assert!(!include_closed);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_task_comment_with_assignee() {
        let action = parse(
            r#"{"action":"create_task_comment","task_id":"T1","comment_text":"please review","assignee":101}"#,
        )
        .unwrap();
        match action {
            ClickupAction::CreateTaskComment {
                task_id,
                comment_text,
                assignee,
                notify_all,
                ..
            } => {
                assert_eq!(task_id, "T1");
                assert_eq!(comment_text, "please review");
                assert_eq!(assignee, Some(101));
                assert!(notify_all);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_action_fails() {
        let result = parse(r#"{"action":"do_the_thing"}"#);
        assert!(result.is_err(), "unknown action should fail to deserialize");
    }

    #[test]
    fn parse_missing_required_field_fails() {
        let result = parse(r#"{"action":"get_task"}"#);
        assert!(result.is_err(), "missing task_id should fail");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(ClickupAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        assert!(
            json.contains("get_authenticated_user")
                && json.contains("list_filtered_team_tasks")
                && json.contains("create_task"),
            "schema should reference every variant; got: {}",
            &json[..json.len().min(400)]
        );
    }
}
