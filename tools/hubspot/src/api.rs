use crate::hubspot::{append_query, request, require_token, url_encode};
use crate::types::HubspotObjectType;

const LIST_LIMIT_MAX: u32 = 100;
const SEARCH_LIMIT_MAX: u32 = 100;

pub fn list_objects(
    object_type: HubspotObjectType,
    limit: u32,
    properties: &[String],
    after: Option<&str>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = format!("/crm/v3/objects/{}", object_type.as_path());
    append_query(&mut url, "limit", &clamp_list_limit(limit).to_string());
    if !properties.is_empty() {
        append_query(&mut url, "properties", &properties.join(","));
    }
    if let Some(cursor) = after {
        append_query(&mut url, "after", cursor);
    }
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn search_objects(
    object_type: HubspotObjectType,
    query: Option<&str>,
    filter_groups: Option<&[serde_json::Value]>,
    properties: &[String],
    limit: u32,
    after: Option<&str>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let payload = build_search_payload(query, filter_groups, properties, limit, after);
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize HubSpot search payload: {}", e))?;
    let url = format!("/crm/v3/objects/{}/search", object_type.as_path());
    let (_, response) = request("POST", &url, Some(&body))?;
    Ok(response)
}

pub fn get_object(
    object_type: HubspotObjectType,
    id: &str,
    properties: &[String],
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = format!(
        "/crm/v3/objects/{}/{}",
        object_type.as_path(),
        url_encode(id)
    );
    if !properties.is_empty() {
        append_query(&mut url, "properties", &properties.join(","));
    }
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn create_object(
    object_type: HubspotObjectType,
    properties: &serde_json::Map<String, serde_json::Value>,
    associations: Option<&[serde_json::Value]>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut payload = serde_json::Map::new();
    payload.insert(
        "properties".into(),
        serde_json::Value::Object(properties.clone()),
    );
    if let Some(assoc) = associations {
        payload.insert(
            "associations".into(),
            serde_json::Value::Array(assoc.to_vec()),
        );
    }
    let body = serde_json::to_string(&serde_json::Value::Object(payload))
        .map_err(|e| format!("Failed to serialize HubSpot create payload: {}", e))?;
    let url = format!("/crm/v3/objects/{}", object_type.as_path());
    let (_, response) = request("POST", &url, Some(&body))?;
    Ok(response)
}

pub fn update_object(
    object_type: HubspotObjectType,
    id: &str,
    properties: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut payload = serde_json::Map::new();
    payload.insert(
        "properties".into(),
        serde_json::Value::Object(properties.clone()),
    );
    let body = serde_json::to_string(&serde_json::Value::Object(payload))
        .map_err(|e| format!("Failed to serialize HubSpot update payload: {}", e))?;
    let url = format!(
        "/crm/v3/objects/{}/{}",
        object_type.as_path(),
        url_encode(id)
    );
    let (_, response) = request("PATCH", &url, Some(&body))?;
    Ok(response)
}

pub fn archive_object(
    object_type: HubspotObjectType,
    id: &str,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!(
        "/crm/v3/objects/{}/{}",
        object_type.as_path(),
        url_encode(id)
    );
    let (_, response) = request("DELETE", &url, None)?;
    Ok(response)
}

pub fn list_lists(
    limit: u32,
    offset: u32,
    query: Option<&str>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut payload = serde_json::Map::new();
    payload.insert(
        "count".into(),
        serde_json::Value::Number(clamp_list_limit(limit).into()),
    );
    payload.insert("offset".into(), serde_json::Value::Number(offset.into()));
    if let Some(q) = query {
        payload.insert("query".into(), serde_json::Value::String(q.to_string()));
    }
    let body = serde_json::to_string(&serde_json::Value::Object(payload))
        .map_err(|e| format!("Failed to serialize HubSpot lists search payload: {}", e))?;
    let (_, response) = request("POST", "/crm/v3/lists/search", Some(&body))?;
    Ok(response)
}

pub fn get_list_members(
    list_id: &str,
    limit: u32,
    after: Option<&str>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = format!("/crm/v3/lists/{}/memberships", url_encode(list_id));
    append_query(&mut url, "limit", &clamp_list_limit(limit).to_string());
    if let Some(cursor) = after {
        append_query(&mut url, "after", cursor);
    }
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn list_owners(
    limit: u32,
    after: Option<&str>,
    email: Option<&str>,
    archived: bool,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = String::from("/crm/v3/owners/");
    append_query(&mut url, "limit", &clamp_list_limit(limit).to_string());
    if let Some(cursor) = after {
        append_query(&mut url, "after", cursor);
    }
    if let Some(addr) = email {
        append_query(&mut url, "email", addr);
    }
    if archived {
        append_query(&mut url, "archived", "true");
    }
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn list_properties(
    object_type: HubspotObjectType,
    archived: bool,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut url = format!("/crm/v3/properties/{}", object_type.as_path());
    if archived {
        append_query(&mut url, "archived", "true");
    }
    let (_, body) = request("GET", &url, None)?;
    Ok(body)
}

pub fn hubspot_request(
    method: &str,
    path: &str,
    body: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    validate_request_path(path)?;
    let body_string = match body {
        Some(v) => Some(
            serde_json::to_string(v)
                .map_err(|e| format!("Failed to serialize raw request body: {}", e))?,
        ),
        None => None,
    };
    let (_, response) = request(method, path, body_string.as_deref())?;
    Ok(response)
}

fn build_search_payload(
    query: Option<&str>,
    filter_groups: Option<&[serde_json::Value]>,
    properties: &[String],
    limit: u32,
    after: Option<&str>,
) -> serde_json::Value {
    let mut payload = serde_json::Map::new();
    if let Some(q) = query {
        payload.insert("query".into(), serde_json::Value::String(q.to_string()));
    }
    if let Some(groups) = filter_groups {
        payload.insert(
            "filterGroups".into(),
            serde_json::Value::Array(groups.to_vec()),
        );
    }
    if !properties.is_empty() {
        payload.insert(
            "properties".into(),
            serde_json::Value::Array(
                properties
                    .iter()
                    .map(|p| serde_json::Value::String(p.clone()))
                    .collect(),
            ),
        );
    }
    payload.insert(
        "limit".into(),
        serde_json::Value::Number(clamp_search_limit(limit).into()),
    );
    if let Some(cursor) = after {
        payload.insert(
            "after".into(),
            serde_json::Value::String(cursor.to_string()),
        );
    }
    serde_json::Value::Object(payload)
}

fn validate_request_path(path: &str) -> Result<(), String> {
    if !path.starts_with("/crm/v3/") {
        return Err(format!(
            "Path must start with /crm/v3/ (tool is scoped to CRM v3 endpoints): {}",
            path
        ));
    }
    Ok(())
}

fn clamp_list_limit(limit: u32) -> u32 {
    limit.clamp(1, LIST_LIMIT_MAX)
}

fn clamp_search_limit(limit: u32) -> u32 {
    limit.clamp(1, SEARCH_LIMIT_MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_list_caps_at_max() {
        assert_eq!(clamp_list_limit(500), LIST_LIMIT_MAX);
    }

    #[test]
    fn clamp_list_zero_becomes_one() {
        assert_eq!(clamp_list_limit(0), 1);
    }

    #[test]
    fn clamp_search_caps_at_max() {
        assert_eq!(clamp_search_limit(1_000), SEARCH_LIMIT_MAX);
    }

    #[test]
    fn clamp_search_in_range_passes_through() {
        assert_eq!(clamp_search_limit(50), 50);
    }

    #[test]
    fn build_search_payload_omits_optional_fields_when_unset() {
        let payload = build_search_payload(None, None, &[], 10, None);
        let obj = payload.as_object().unwrap();
        assert!(!obj.contains_key("query"));
        assert!(!obj.contains_key("filterGroups"));
        assert!(!obj.contains_key("properties"));
        assert!(!obj.contains_key("after"));
        assert_eq!(obj.get("limit").and_then(|v| v.as_u64()), Some(10));
    }

    #[test]
    fn build_search_payload_includes_filter_groups_and_properties() {
        let groups = vec![serde_json::json!({
            "filters": [{"propertyName":"amount","operator":"GT","value":"1000"}]
        })];
        let props = vec!["amount".to_string(), "dealname".to_string()];
        let payload = build_search_payload(Some("Acme"), Some(&groups), &props, 25, Some("NXTQ"));
        let obj = payload.as_object().unwrap();
        assert_eq!(obj.get("query").and_then(|v| v.as_str()), Some("Acme"));
        assert_eq!(obj.get("after").and_then(|v| v.as_str()), Some("NXTQ"));
        assert_eq!(obj.get("limit").and_then(|v| v.as_u64()), Some(25));
        let group_array = obj.get("filterGroups").and_then(|v| v.as_array()).unwrap();
        assert_eq!(group_array.len(), 1);
        let prop_array = obj.get("properties").and_then(|v| v.as_array()).unwrap();
        assert_eq!(prop_array.len(), 2);
        assert_eq!(prop_array[0].as_str(), Some("amount"));
    }

    #[test]
    fn build_search_payload_clamps_limit() {
        let payload = build_search_payload(None, None, &[], 9_999, None);
        let obj = payload.as_object().unwrap();
        assert_eq!(
            obj.get("limit").and_then(|v| v.as_u64()),
            Some(u64::from(SEARCH_LIMIT_MAX))
        );
    }

    #[test]
    fn validate_request_path_accepts_crm_v3() {
        assert!(validate_request_path("/crm/v3/objects/contacts/123").is_ok());
        assert!(validate_request_path("/crm/v3/lists/search").is_ok());
        assert!(validate_request_path("/crm/v3/owners/").is_ok());
    }

    #[test]
    fn validate_request_path_rejects_outside_crm_v3() {
        assert!(validate_request_path("/contacts/v1/lists").is_err());
        assert!(validate_request_path("/marketing/v3/emails").is_err());
        assert!(validate_request_path("crm/v3/objects/contacts").is_err());
        assert!(validate_request_path("/crm/v4/objects/contacts").is_err());
    }
}
