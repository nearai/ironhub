use serde_json::{json, Value};

use crate::irm::{require_non_empty, rpc};
use crate::types::OrderDirection;

pub fn list_incidents(limit: u32, order_direction: OrderDirection) -> Result<Value, String> {
    let body = json!({
        "incidentsQuery": {
            "limit": limit,
            "orderDirection": order_direction.as_grafana(),
        },
    });
    rpc("IncidentsService.QueryIncidents", &body)
}

pub fn get_incident(incident_id: &str) -> Result<Value, String> {
    require_non_empty(incident_id, "incident_id")?;
    rpc(
        "IncidentsService.GetIncident",
        &json!({ "incidentID": incident_id }),
    )
}

pub fn get_timeline(
    incident_id: &str,
    limit: u32,
    tag: Option<&str>,
    order_direction: OrderDirection,
    activity_kind: &[String],
) -> Result<Value, String> {
    require_non_empty(incident_id, "incident_id")?;
    let mut query = json!({
        "incidentID": incident_id,
        "limit": limit,
        "orderDirection": order_direction.as_grafana(),
    });
    if let Some(tag) = tag {
        query["tag"] = json!(tag);
    }
    if !activity_kind.is_empty() {
        query["activityKind"] = json!(activity_kind);
    }
    rpc(
        "ActivityService.QueryActivity",
        &json!({ "activityQuery": query }),
    )
}

pub fn list_fields() -> Result<Value, String> {
    rpc("FieldsService.GetFields", &json!({}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_incident_rejects_blank_id() {
        assert!(get_incident("   ").is_err());
    }

    #[test]
    fn get_timeline_rejects_blank_id() {
        assert!(get_timeline("", 20, None, OrderDirection::Descending, &[]).is_err());
    }
}
