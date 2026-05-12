use crate::clickup::{
    append_custom_task_ids, append_query, append_query_bool, append_query_csv_u64,
    append_query_repeated, append_query_repeated_u64, request, require_token, url_encode,
};
use serde_json::{json, Map, Value};

pub fn get_authenticated_user() -> Result<Value, String> {
    require_token()?;
    let (_status, value) = request("GET", "/user", None)?;
    Ok(value)
}

pub fn list_workspaces() -> Result<Value, String> {
    require_token()?;
    let (_status, value) = request("GET", "/team", None)?;
    Ok(value)
}

pub fn list_spaces(workspace_id: &str, archived: bool) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/team/{}/space", url_encode(workspace_id));
    append_query_bool(&mut url, "archived", archived);
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn get_space(space_id: &str) -> Result<Value, String> {
    require_token()?;
    let url = format!("/space/{}", url_encode(space_id));
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn list_folders(space_id: &str, archived: bool) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/space/{}/folder", url_encode(space_id));
    append_query_bool(&mut url, "archived", archived);
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn get_folder(folder_id: &str) -> Result<Value, String> {
    require_token()?;
    let url = format!("/folder/{}", url_encode(folder_id));
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn list_lists(folder_id: &str, archived: bool) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/folder/{}/list", url_encode(folder_id));
    append_query_bool(&mut url, "archived", archived);
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn list_folderless_lists(space_id: &str, archived: bool) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/space/{}/list", url_encode(space_id));
    append_query_bool(&mut url, "archived", archived);
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn get_list(list_id: &str) -> Result<Value, String> {
    require_token()?;
    let url = format!("/list/{}", url_encode(list_id));
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub struct CreateListRequest<'a> {
    pub folder_id: &'a str,
    pub name: &'a str,
    pub content: Option<&'a str>,
    pub due_date: Option<i64>,
    pub due_date_time: bool,
    pub priority: Option<u32>,
    pub assignee: Option<u64>,
    pub status: Option<&'a str>,
}

pub fn create_list(req: &CreateListRequest<'_>) -> Result<Value, String> {
    require_token()?;
    if req.name.trim().is_empty() {
        return Err("create_list requires a non-empty name".to_string());
    }
    let mut payload = Map::new();
    payload.insert("name".into(), json!(req.name));
    if let Some(c) = req.content {
        payload.insert("content".into(), json!(c));
    }
    if let Some(d) = req.due_date {
        payload.insert("due_date".into(), json!(d));
        payload.insert("due_date_time".into(), json!(req.due_date_time));
    }
    if let Some(p) = req.priority {
        validate_priority(p)?;
        payload.insert("priority".into(), json!(p));
    }
    if let Some(a) = req.assignee {
        payload.insert("assignee".into(), json!(a));
    }
    if let Some(s) = req.status {
        payload.insert("status".into(), json!(s));
    }
    let body = serde_json::to_string(&Value::Object(payload)).map_err(|e| e.to_string())?;
    let url = format!("/folder/{}/list", url_encode(req.folder_id));
    let (_status, value) = request("POST", &url, Some(&body))?;
    Ok(value)
}

pub struct ListTasksRequest<'a> {
    pub list_id: &'a str,
    pub archived: bool,
    pub page: u32,
    pub order_by: Option<&'a str>,
    pub reverse: bool,
    pub subtasks: bool,
    pub statuses: &'a [String],
    pub include_closed: bool,
    pub assignees: &'a [u64],
    pub tags: &'a [String],
    pub due_date_gt: Option<i64>,
    pub due_date_lt: Option<i64>,
}

pub fn list_tasks(req: &ListTasksRequest<'_>) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/list/{}/task", url_encode(req.list_id));
    append_query_bool(&mut url, "archived", req.archived);
    append_query(&mut url, "page", &req.page.to_string());
    append_query_bool(&mut url, "reverse", req.reverse);
    append_query_bool(&mut url, "subtasks", req.subtasks);
    append_query_bool(&mut url, "include_closed", req.include_closed);
    if let Some(o) = req.order_by {
        append_query(&mut url, "order_by", o);
    }
    append_query_repeated(&mut url, "statuses[]", req.statuses);
    append_query_repeated_u64(&mut url, "assignees[]", req.assignees);
    append_query_repeated(&mut url, "tags[]", req.tags);
    if let Some(t) = req.due_date_gt {
        append_query(&mut url, "due_date_gt", &t.to_string());
    }
    if let Some(t) = req.due_date_lt {
        append_query(&mut url, "due_date_lt", &t.to_string());
    }
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub struct ListFilteredTeamTasksRequest<'a> {
    pub workspace_id: &'a str,
    pub page: u32,
    pub order_by: Option<&'a str>,
    pub reverse: bool,
    pub subtasks: bool,
    pub space_ids: &'a [String],
    pub project_ids: &'a [String],
    pub list_ids: &'a [String],
    pub statuses: &'a [String],
    pub include_closed: bool,
    pub assignees: &'a [u64],
    pub tags: &'a [String],
    pub due_date_gt: Option<i64>,
    pub due_date_lt: Option<i64>,
    pub date_created_gt: Option<i64>,
    pub date_created_lt: Option<i64>,
    pub date_updated_gt: Option<i64>,
    pub date_updated_lt: Option<i64>,
}

pub fn list_filtered_team_tasks(req: &ListFilteredTeamTasksRequest<'_>) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/team/{}/task", url_encode(req.workspace_id));
    append_query(&mut url, "page", &req.page.to_string());
    append_query_bool(&mut url, "reverse", req.reverse);
    append_query_bool(&mut url, "subtasks", req.subtasks);
    append_query_bool(&mut url, "include_closed", req.include_closed);
    if let Some(o) = req.order_by {
        append_query(&mut url, "order_by", o);
    }
    append_query_repeated(&mut url, "space_ids[]", req.space_ids);
    append_query_repeated(&mut url, "project_ids[]", req.project_ids);
    append_query_repeated(&mut url, "list_ids[]", req.list_ids);
    append_query_repeated(&mut url, "statuses[]", req.statuses);
    append_query_repeated_u64(&mut url, "assignees[]", req.assignees);
    append_query_repeated(&mut url, "tags[]", req.tags);
    if let Some(t) = req.due_date_gt {
        append_query(&mut url, "due_date_gt", &t.to_string());
    }
    if let Some(t) = req.due_date_lt {
        append_query(&mut url, "due_date_lt", &t.to_string());
    }
    if let Some(t) = req.date_created_gt {
        append_query(&mut url, "date_created_gt", &t.to_string());
    }
    if let Some(t) = req.date_created_lt {
        append_query(&mut url, "date_created_lt", &t.to_string());
    }
    if let Some(t) = req.date_updated_gt {
        append_query(&mut url, "date_updated_gt", &t.to_string());
    }
    if let Some(t) = req.date_updated_lt {
        append_query(&mut url, "date_updated_lt", &t.to_string());
    }
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn get_task(
    task_id: &str,
    custom_task_ids: bool,
    workspace_id: Option<&str>,
    include_subtasks: bool,
) -> Result<Value, String> {
    require_token()?;
    if custom_task_ids && workspace_id.is_none() {
        return Err(
            "get_task: custom_task_ids=true requires workspace_id (the v2 API expects team_id)"
                .to_string(),
        );
    }
    let mut url = format!("/task/{}", url_encode(task_id));
    append_custom_task_ids(&mut url, custom_task_ids, workspace_id);
    if include_subtasks {
        append_query_bool(&mut url, "include_subtasks", true);
    }
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub struct CreateTaskRequest<'a> {
    pub list_id: &'a str,
    pub name: &'a str,
    pub description: Option<&'a str>,
    pub assignees: &'a [u64],
    pub tags: &'a [String],
    pub status: Option<&'a str>,
    pub priority: Option<u32>,
    pub due_date: Option<i64>,
    pub due_date_time: bool,
    pub start_date: Option<i64>,
    pub start_date_time: bool,
    pub notify_all: bool,
    pub parent: Option<&'a str>,
}

pub fn create_task(req: &CreateTaskRequest<'_>) -> Result<Value, String> {
    require_token()?;
    if req.name.trim().is_empty() {
        return Err("create_task requires a non-empty name".to_string());
    }
    let mut payload = Map::new();
    payload.insert("name".into(), json!(req.name));
    if let Some(d) = req.description {
        payload.insert("description".into(), json!(d));
    }
    if !req.assignees.is_empty() {
        payload.insert("assignees".into(), json!(req.assignees));
    }
    if !req.tags.is_empty() {
        payload.insert("tags".into(), json!(req.tags));
    }
    if let Some(s) = req.status {
        payload.insert("status".into(), json!(s));
    }
    if let Some(p) = req.priority {
        validate_priority(p)?;
        payload.insert("priority".into(), json!(p));
    }
    if let Some(d) = req.due_date {
        payload.insert("due_date".into(), json!(d));
        payload.insert("due_date_time".into(), json!(req.due_date_time));
    }
    if let Some(d) = req.start_date {
        payload.insert("start_date".into(), json!(d));
        payload.insert("start_date_time".into(), json!(req.start_date_time));
    }
    payload.insert("notify_all".into(), json!(req.notify_all));
    if let Some(p) = req.parent {
        payload.insert("parent".into(), json!(p));
    }
    let body = serde_json::to_string(&Value::Object(payload)).map_err(|e| e.to_string())?;
    let url = format!("/list/{}/task", url_encode(req.list_id));
    let (_status, value) = request("POST", &url, Some(&body))?;
    Ok(value)
}

pub struct UpdateTaskRequest<'a> {
    pub task_id: &'a str,
    pub custom_task_ids: bool,
    pub workspace_id: Option<&'a str>,
    pub name: Option<&'a str>,
    pub description: Option<&'a str>,
    pub status: Option<&'a str>,
    pub priority: Option<u32>,
    pub due_date: Option<i64>,
    pub due_date_time: Option<bool>,
    pub start_date: Option<i64>,
    pub start_date_time: Option<bool>,
    pub assignees_add: &'a [u64],
    pub assignees_rem: &'a [u64],
    pub archived: Option<bool>,
}

pub fn update_task(req: &UpdateTaskRequest<'_>) -> Result<Value, String> {
    require_token()?;
    if req.custom_task_ids && req.workspace_id.is_none() {
        return Err("update_task: custom_task_ids=true requires workspace_id".to_string());
    }
    let mut payload = Map::new();
    if let Some(n) = req.name {
        payload.insert("name".into(), json!(n));
    }
    if let Some(d) = req.description {
        payload.insert("description".into(), json!(d));
    }
    if let Some(s) = req.status {
        payload.insert("status".into(), json!(s));
    }
    if let Some(p) = req.priority {
        validate_priority(p)?;
        payload.insert("priority".into(), json!(p));
    }
    if let Some(d) = req.due_date {
        payload.insert("due_date".into(), json!(d));
    }
    if let Some(b) = req.due_date_time {
        payload.insert("due_date_time".into(), json!(b));
    }
    if let Some(d) = req.start_date {
        payload.insert("start_date".into(), json!(d));
    }
    if let Some(b) = req.start_date_time {
        payload.insert("start_date_time".into(), json!(b));
    }
    if !req.assignees_add.is_empty() || !req.assignees_rem.is_empty() {
        payload.insert(
            "assignees".into(),
            json!({
                "add": req.assignees_add,
                "rem": req.assignees_rem,
            }),
        );
    }
    if let Some(a) = req.archived {
        payload.insert("archived".into(), json!(a));
    }
    if payload.is_empty() {
        return Err(
            "update_task requires at least one field to change (name, description, status, priority, due_date, start_date, assignees, archived)"
                .to_string(),
        );
    }
    let body = serde_json::to_string(&Value::Object(payload)).map_err(|e| e.to_string())?;
    let mut url = format!("/task/{}", url_encode(req.task_id));
    append_custom_task_ids(&mut url, req.custom_task_ids, req.workspace_id);
    let (_status, value) = request("PUT", &url, Some(&body))?;
    Ok(value)
}

pub fn delete_task(
    task_id: &str,
    custom_task_ids: bool,
    workspace_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    if custom_task_ids && workspace_id.is_none() {
        return Err("delete_task: custom_task_ids=true requires workspace_id".to_string());
    }
    let mut url = format!("/task/{}", url_encode(task_id));
    append_custom_task_ids(&mut url, custom_task_ids, workspace_id);
    let (_status, _value) = request("DELETE", &url, None)?;
    Ok(json!({ "deleted": task_id }))
}

pub fn add_task_tag(
    task_id: &str,
    tag_name: &str,
    custom_task_ids: bool,
    workspace_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    if custom_task_ids && workspace_id.is_none() {
        return Err("add_task_tag: custom_task_ids=true requires workspace_id".to_string());
    }
    let mut url = format!("/task/{}/tag/{}", url_encode(task_id), url_encode(tag_name));
    append_custom_task_ids(&mut url, custom_task_ids, workspace_id);
    let (_status, _value) = request("POST", &url, Some("{}"))?;
    Ok(json!({ "tagged": tag_name, "task_id": task_id }))
}

pub fn remove_task_tag(
    task_id: &str,
    tag_name: &str,
    custom_task_ids: bool,
    workspace_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    if custom_task_ids && workspace_id.is_none() {
        return Err("remove_task_tag: custom_task_ids=true requires workspace_id".to_string());
    }
    let mut url = format!("/task/{}/tag/{}", url_encode(task_id), url_encode(tag_name));
    append_custom_task_ids(&mut url, custom_task_ids, workspace_id);
    let (_status, _value) = request("DELETE", &url, None)?;
    Ok(json!({ "untagged": tag_name, "task_id": task_id }))
}

pub fn list_task_comments(
    task_id: &str,
    custom_task_ids: bool,
    workspace_id: Option<&str>,
    start: Option<i64>,
    start_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    if custom_task_ids && workspace_id.is_none() {
        return Err("list_task_comments: custom_task_ids=true requires workspace_id".to_string());
    }
    let mut url = format!("/task/{}/comment", url_encode(task_id));
    append_custom_task_ids(&mut url, custom_task_ids, workspace_id);
    if let Some(s) = start {
        append_query(&mut url, "start", &s.to_string());
    }
    if let Some(s) = start_id {
        append_query(&mut url, "start_id", s);
    }
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn create_task_comment(
    task_id: &str,
    comment_text: &str,
    assignee: Option<u64>,
    notify_all: bool,
    custom_task_ids: bool,
    workspace_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    if comment_text.trim().is_empty() {
        return Err("create_task_comment requires non-empty comment_text".to_string());
    }
    if custom_task_ids && workspace_id.is_none() {
        return Err("create_task_comment: custom_task_ids=true requires workspace_id".to_string());
    }
    let mut payload = Map::new();
    payload.insert("comment_text".into(), json!(comment_text));
    payload.insert("notify_all".into(), json!(notify_all));
    if let Some(a) = assignee {
        payload.insert("assignee".into(), json!(a));
    }
    let body = serde_json::to_string(&Value::Object(payload)).map_err(|e| e.to_string())?;
    let mut url = format!("/task/{}/comment", url_encode(task_id));
    append_custom_task_ids(&mut url, custom_task_ids, workspace_id);
    let (_status, value) = request("POST", &url, Some(&body))?;
    Ok(value)
}

pub fn update_comment(
    comment_id: &str,
    comment_text: &str,
    assignee: Option<u64>,
    resolved: Option<bool>,
) -> Result<Value, String> {
    require_token()?;
    if comment_text.trim().is_empty() {
        return Err("update_comment requires non-empty comment_text".to_string());
    }
    let mut payload = Map::new();
    payload.insert("comment_text".into(), json!(comment_text));
    if let Some(a) = assignee {
        payload.insert("assignee".into(), json!(a));
    }
    if let Some(r) = resolved {
        payload.insert("resolved".into(), json!(r));
    }
    let body = serde_json::to_string(&Value::Object(payload)).map_err(|e| e.to_string())?;
    let url = format!("/comment/{}", url_encode(comment_id));
    let (_status, _value) = request("PUT", &url, Some(&body))?;
    Ok(json!({ "updated": comment_id }))
}

pub fn delete_comment(comment_id: &str) -> Result<Value, String> {
    require_token()?;
    let url = format!("/comment/{}", url_encode(comment_id));
    let (_status, _value) = request("DELETE", &url, None)?;
    Ok(json!({ "deleted": comment_id }))
}

pub struct ListTimeEntriesRequest<'a> {
    pub workspace_id: &'a str,
    pub start_date: Option<i64>,
    pub end_date: Option<i64>,
    pub assignees: &'a [u64],
    pub include_task_tags: bool,
    pub include_location_names: bool,
    pub space_id: Option<&'a str>,
    pub folder_id: Option<&'a str>,
    pub list_id: Option<&'a str>,
    pub task_id: Option<&'a str>,
}

pub fn list_time_entries(req: &ListTimeEntriesRequest<'_>) -> Result<Value, String> {
    require_token()?;
    let location_filter_count = [
        req.space_id.is_some(),
        req.folder_id.is_some(),
        req.list_id.is_some(),
        req.task_id.is_some(),
    ]
    .iter()
    .filter(|set| **set)
    .count();
    if location_filter_count > 1 {
        return Err(
            "list_time_entries: only one of space_id, folder_id, list_id, task_id may be set"
                .to_string(),
        );
    }
    let mut url = format!("/team/{}/time_entries", url_encode(req.workspace_id));
    if let Some(t) = req.start_date {
        append_query(&mut url, "start_date", &t.to_string());
    }
    if let Some(t) = req.end_date {
        append_query(&mut url, "end_date", &t.to_string());
    }
    append_query_csv_u64(&mut url, "assignee", req.assignees);
    if req.include_task_tags {
        append_query_bool(&mut url, "include_task_tags", true);
    }
    if req.include_location_names {
        append_query_bool(&mut url, "include_location_names", true);
    }
    if let Some(s) = req.space_id {
        append_query(&mut url, "space_id", s);
    }
    if let Some(f) = req.folder_id {
        append_query(&mut url, "folder_id", f);
    }
    if let Some(l) = req.list_id {
        append_query(&mut url, "list_id", l);
    }
    if let Some(t) = req.task_id {
        append_query(&mut url, "task_id", t);
    }
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn get_running_time_entry(workspace_id: &str, assignee: Option<u64>) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/team/{}/time_entries/current", url_encode(workspace_id));
    if let Some(a) = assignee {
        append_query(&mut url, "assignee", &a.to_string());
    }
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn list_goals(workspace_id: &str, include_completed: bool) -> Result<Value, String> {
    require_token()?;
    let mut url = format!("/team/{}/goal", url_encode(workspace_id));
    append_query_bool(&mut url, "include_completed", include_completed);
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

pub fn get_goal(goal_id: &str) -> Result<Value, String> {
    require_token()?;
    let url = format!("/goal/{}", url_encode(goal_id));
    let (_status, value) = request("GET", &url, None)?;
    Ok(value)
}

fn validate_priority(p: u32) -> Result<(), String> {
    if (1..=4).contains(&p) {
        Ok(())
    } else {
        Err(format!(
            "priority must be one of 1 (urgent), 2 (high), 3 (normal), 4 (low); got {}",
            p
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_priority_accepts_one_through_four() {
        for p in 1..=4 {
            assert!(
                validate_priority(p).is_ok(),
                "priority {} should be valid",
                p
            );
        }
    }

    #[test]
    fn validate_priority_rejects_zero() {
        assert!(validate_priority(0).is_err());
    }

    #[test]
    fn validate_priority_rejects_five_and_above() {
        assert!(validate_priority(5).is_err());
        assert!(validate_priority(100).is_err());
    }
}
