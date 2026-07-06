use crate::attio::{append_query, request, require_token, url_encode};
use crate::types::NoteFormat;

const QUERY_LIMIT_MAX: u32 = 1000;

pub fn list_records(
    object: &str,
    filter: Option<&serde_json::Value>,
    sorts: Option<&serde_json::Value>,
    limit: u32,
    offset: u32,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let payload = build_query_payload(filter, sorts, limit, offset);
    let body = serialize(&payload)?;
    let url = format!("/v2/objects/{}/records/query", url_encode(object));
    let (_, response) = request("POST", &url, Some(&body))?;
    Ok(response)
}

pub fn get_record(object: &str, record_id: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!(
        "/v2/objects/{}/records/{}",
        url_encode(object),
        url_encode(record_id)
    );
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn create_record(
    object: &str,
    values: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let body = serialize(&data_values(values))?;
    let url = format!("/v2/objects/{}/records", url_encode(object));
    let (_, response) = request("POST", &url, Some(&body))?;
    Ok(response)
}

pub fn update_record(
    object: &str,
    record_id: &str,
    values: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let body = serialize(&data_values(values))?;
    let url = format!(
        "/v2/objects/{}/records/{}",
        url_encode(object),
        url_encode(record_id)
    );
    let (_, response) = request("PATCH", &url, Some(&body))?;
    Ok(response)
}

pub fn assert_record(
    object: &str,
    matching_attribute: &str,
    values: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let body = serialize(&data_values(values))?;
    let mut url = format!("/v2/objects/{}/records", url_encode(object));
    append_query(&mut url, "matching_attribute", matching_attribute);
    let (_, response) = request("PUT", &url, Some(&body))?;
    Ok(response)
}

pub fn delete_record(object: &str, record_id: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!(
        "/v2/objects/{}/records/{}",
        url_encode(object),
        url_encode(record_id)
    );
    let (_, response) = request("DELETE", &url, None)?;
    Ok(response)
}

pub fn list_attributes(object: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!("/v2/objects/{}/attributes", url_encode(object));
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn list_objects() -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request("GET", "/v2/objects", None)?;
    Ok(body)
}

pub fn list_lists() -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request("GET", "/v2/lists", None)?;
    Ok(body)
}

pub fn query_list_entries(
    list: &str,
    filter: Option<&serde_json::Value>,
    sorts: Option<&serde_json::Value>,
    limit: u32,
    offset: u32,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let payload = build_query_payload(filter, sorts, limit, offset);
    let body = serialize(&payload)?;
    let url = format!("/v2/lists/{}/entries/query", url_encode(list));
    let (_, response) = request("POST", &url, Some(&body))?;
    Ok(response)
}

pub fn list_notes(
    parent_object: Option<&str>,
    parent_record_id: Option<&str>,
    limit: u32,
    offset: u32,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = String::from("/v2/notes");
    append_query(&mut url, "limit", &clamp_limit(limit).to_string());
    append_query(&mut url, "offset", &offset.to_string());
    if let Some(parent) = parent_object {
        append_query(&mut url, "parent_object", parent);
    }
    if let Some(record) = parent_record_id {
        append_query(&mut url, "parent_record_id", record);
    }
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn create_note(
    parent_object: &str,
    parent_record_id: &str,
    title: &str,
    content: &str,
    format: NoteFormat,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let body = serialize(&build_note_payload(
        parent_object,
        parent_record_id,
        title,
        content,
        format,
    ))?;
    let (_, response) = request("POST", "/v2/notes", Some(&body))?;
    Ok(response)
}

pub fn list_tasks(limit: u32, offset: u32) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = String::from("/v2/tasks");
    append_query(&mut url, "limit", &clamp_limit(limit).to_string());
    append_query(&mut url, "offset", &offset.to_string());
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn create_task(
    content: &str,
    deadline_at: Option<&str>,
    is_completed: Option<bool>,
    linked_records: Option<&serde_json::Value>,
    assignees: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let body = serialize(&build_task_payload(
        content,
        deadline_at,
        is_completed,
        linked_records,
        assignees,
    ))?;
    let (_, response) = request("POST", "/v2/tasks", Some(&body))?;
    Ok(response)
}

pub fn self_info() -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request("GET", "/v2/self", None)?;
    Ok(body)
}

pub fn attio_request(
    method: &str,
    path: &str,
    body: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    validate_request_path(path)?;
    let body_string = match body {
        Some(v) => Some(serialize(v)?),
        None => None,
    };
    let (_, response) = request(method, path, body_string.as_deref())?;
    Ok(response)
}

fn build_query_payload(
    filter: Option<&serde_json::Value>,
    sorts: Option<&serde_json::Value>,
    limit: u32,
    offset: u32,
) -> serde_json::Value {
    let mut payload = serde_json::Map::new();
    if let Some(f) = filter {
        payload.insert("filter".into(), f.clone());
    }
    if let Some(s) = sorts {
        payload.insert("sorts".into(), s.clone());
    }
    payload.insert(
        "limit".into(),
        serde_json::Value::Number(clamp_limit(limit).into()),
    );
    payload.insert("offset".into(), serde_json::Value::Number(offset.into()));
    serde_json::Value::Object(payload)
}

fn data_values(values: &serde_json::Map<String, serde_json::Value>) -> serde_json::Value {
    serde_json::json!({ "data": { "values": serde_json::Value::Object(values.clone()) } })
}

fn build_note_payload(
    parent_object: &str,
    parent_record_id: &str,
    title: &str,
    content: &str,
    format: NoteFormat,
) -> serde_json::Value {
    serde_json::json!({
        "data": {
            "parent_object": parent_object,
            "parent_record_id": parent_record_id,
            "title": title,
            "format": format.as_str(),
            "content": content,
        }
    })
}

// Attio marks all six task fields required on create, so emit them all and
// default the optional ones (null deadline, not completed, no links or
// assignees) rather than omitting them, which would return a 400.
fn build_task_payload(
    content: &str,
    deadline_at: Option<&str>,
    is_completed: Option<bool>,
    linked_records: Option<&serde_json::Value>,
    assignees: Option<&serde_json::Value>,
) -> serde_json::Value {
    serde_json::json!({
        "data": {
            "content": content,
            "format": "plaintext",
            "deadline_at": deadline_at,
            "is_completed": is_completed.unwrap_or(false),
            "linked_records": linked_records.cloned().unwrap_or_else(|| serde_json::json!([])),
            "assignees": assignees.cloned().unwrap_or_else(|| serde_json::json!([])),
        }
    })
}

fn serialize(value: &serde_json::Value) -> Result<String, String> {
    serde_json::to_string(value)
        .map_err(|e| format!("Failed to serialize Attio request body: {}", e))
}

fn validate_request_path(path: &str) -> Result<(), String> {
    if !path.starts_with("/v2/") {
        return Err(format!(
            "Path must start with /v2/ (tool is scoped to Attio API v2 endpoints): {}",
            path
        ));
    }
    if path.contains("..") {
        return Err(format!("Path must not contain '..' segments: {}", path));
    }
    Ok(())
}

fn clamp_limit(limit: u32) -> u32 {
    limit.clamp(1, QUERY_LIMIT_MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_limit_caps_at_max() {
        assert_eq!(clamp_limit(5_000), QUERY_LIMIT_MAX);
    }

    #[test]
    fn clamp_limit_zero_becomes_one() {
        assert_eq!(clamp_limit(0), 1);
    }

    #[test]
    fn clamp_limit_in_range_passes_through() {
        assert_eq!(clamp_limit(50), 50);
    }

    #[test]
    fn build_query_payload_omits_optional_fields_when_unset() {
        let payload = build_query_payload(None, None, 25, 0);
        let obj = payload.as_object().unwrap();
        assert!(!obj.contains_key("filter"));
        assert!(!obj.contains_key("sorts"));
        assert_eq!(obj.get("limit").and_then(|v| v.as_u64()), Some(25));
        assert_eq!(obj.get("offset").and_then(|v| v.as_u64()), Some(0));
    }

    #[test]
    fn build_query_payload_includes_filter_and_sorts() {
        let filter = serde_json::json!({"name": {"$contains": "Acme"}});
        let sorts = serde_json::json!([{"attribute": "name", "direction": "asc"}]);
        let payload = build_query_payload(Some(&filter), Some(&sorts), 10, 20);
        let obj = payload.as_object().unwrap();
        assert!(obj.get("filter").unwrap().get("name").is_some());
        assert!(obj.get("sorts").unwrap().is_array());
        assert_eq!(obj.get("offset").and_then(|v| v.as_u64()), Some(20));
    }

    #[test]
    fn build_query_payload_clamps_limit() {
        let payload = build_query_payload(None, None, 9_999, 0);
        assert_eq!(
            payload.get("limit").and_then(|v| v.as_u64()),
            Some(u64::from(QUERY_LIMIT_MAX))
        );
    }

    #[test]
    fn data_values_wraps_under_data_values() {
        let mut values = serde_json::Map::new();
        values.insert("stage".into(), serde_json::json!(["Won"]));
        let wrapped = data_values(&values);
        let inner = wrapped
            .get("data")
            .and_then(|d| d.get("values"))
            .and_then(|v| v.get("stage"))
            .unwrap();
        assert!(inner.is_array());
    }

    #[test]
    fn build_task_payload_minimal_includes_all_required_fields() {
        let payload = build_task_payload("Follow up with Ada", None, None, None, None);
        let data = payload.get("data").unwrap();
        assert_eq!(
            data.get("content").and_then(|v| v.as_str()),
            Some("Follow up with Ada")
        );
        assert_eq!(
            data.get("format").and_then(|v| v.as_str()),
            Some("plaintext")
        );
        assert!(data.get("deadline_at").unwrap().is_null());
        assert_eq!(
            data.get("is_completed").and_then(|v| v.as_bool()),
            Some(false)
        );
        assert_eq!(
            data.get("linked_records")
                .and_then(|v| v.as_array())
                .map(|a| a.len()),
            Some(0)
        );
        assert_eq!(
            data.get("assignees")
                .and_then(|v| v.as_array())
                .map(|a| a.len()),
            Some(0)
        );
    }

    #[test]
    fn build_task_payload_uses_caller_values_when_present() {
        let linked =
            serde_json::json!([{ "target_object": "people", "target_record_id": "rec_1" }]);
        let assignees = serde_json::json!([{ "referenced_actor_type": "workspace-member", "referenced_actor_id": "mem_1" }]);
        let payload = build_task_payload(
            "x",
            Some("2026-07-10T00:00:00.000Z"),
            Some(true),
            Some(&linked),
            Some(&assignees),
        );
        let data = payload.get("data").unwrap();
        assert_eq!(
            data.get("deadline_at").and_then(|v| v.as_str()),
            Some("2026-07-10T00:00:00.000Z")
        );
        assert_eq!(
            data.get("is_completed").and_then(|v| v.as_bool()),
            Some(true)
        );
        assert_eq!(
            data.get("linked_records")
                .and_then(|v| v.as_array())
                .map(|a| a.len()),
            Some(1)
        );
        assert_eq!(
            data.get("assignees")
                .and_then(|v| v.as_array())
                .map(|a| a.len()),
            Some(1)
        );
    }

    #[test]
    fn build_note_payload_includes_all_fields() {
        let payload = build_note_payload(
            "people",
            "rec_7",
            "Call summary",
            "Body",
            NoteFormat::Markdown,
        );
        let data = payload.get("data").unwrap();
        assert_eq!(
            data.get("parent_object").and_then(|v| v.as_str()),
            Some("people")
        );
        assert_eq!(
            data.get("parent_record_id").and_then(|v| v.as_str()),
            Some("rec_7")
        );
        assert_eq!(
            data.get("title").and_then(|v| v.as_str()),
            Some("Call summary")
        );
        assert_eq!(data.get("content").and_then(|v| v.as_str()), Some("Body"));
        assert_eq!(
            data.get("format").and_then(|v| v.as_str()),
            Some("markdown")
        );
    }

    #[test]
    fn validate_request_path_accepts_v2() {
        assert!(validate_request_path("/v2/objects/people/records/query").is_ok());
        assert!(validate_request_path("/v2/self").is_ok());
        assert!(validate_request_path("/v2/lists").is_ok());
    }

    #[test]
    fn validate_request_path_rejects_dot_segments() {
        assert!(validate_request_path("/v2/../v1/objects").is_err());
        assert!(validate_request_path("/v2/objects/../../etc").is_err());
    }

    #[test]
    fn validate_request_path_rejects_outside_v2() {
        assert!(validate_request_path("/v1/objects/people").is_err());
        assert!(validate_request_path("v2/objects/people").is_err());
        assert!(validate_request_path("/objects/people").is_err());
        assert!(validate_request_path("https://api.attio.com/v2/self").is_err());
    }
}
