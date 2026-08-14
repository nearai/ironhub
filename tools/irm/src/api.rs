use serde_json::{json, Value};

use crate::irm::{require_non_empty, rpc};
use crate::oncall;
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

pub fn list_on_call(
    schedule_name: Option<&str>,
    team_id: Option<&str>,
    page: Option<u32>,
) -> Result<Value, String> {
    oncall::get(&schedules_endpoint(schedule_name, team_id, page)?)
}

pub fn list_escalation_chains(page: Option<u32>) -> Result<Value, String> {
    let mut endpoint = String::from("/api/v1/escalation_chains/");
    append_page(&mut endpoint, page);
    oncall::get(&endpoint)
}

pub fn get_escalation_policy(
    escalation_chain_id: &str,
    page: Option<u32>,
) -> Result<Value, String> {
    oncall::get(&escalation_endpoint(escalation_chain_id, page)?)
}

fn schedules_endpoint(
    schedule_name: Option<&str>,
    team_id: Option<&str>,
    page: Option<u32>,
) -> Result<String, String> {
    let mut endpoint = String::from("/api/v1/schedules/");
    if let Some(name) = schedule_name {
        require_non_empty(name, "schedule_name")?;
        oncall::append_query(&mut endpoint, "name", name.trim());
    }
    if let Some(team) = team_id {
        require_non_empty(team, "team_id")?;
        oncall::append_query(&mut endpoint, "team_id", team.trim());
    }
    append_page(&mut endpoint, page);
    Ok(endpoint)
}

fn escalation_endpoint(escalation_chain_id: &str, page: Option<u32>) -> Result<String, String> {
    require_non_empty(escalation_chain_id, "escalation_chain_id")?;
    let mut endpoint = String::from("/api/v1/escalation_policies/");
    oncall::append_query(
        &mut endpoint,
        "escalation_chain_id",
        escalation_chain_id.trim(),
    );
    append_page(&mut endpoint, page);
    Ok(endpoint)
}

fn append_page(endpoint: &mut String, page: Option<u32>) {
    if let Some(page) = page {
        oncall::append_query(endpoint, "page", &page.to_string());
    }
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

    #[test]
    fn schedules_endpoint_is_unfiltered_by_default() {
        assert_eq!(
            schedules_endpoint(None, None, None).unwrap(),
            "/api/v1/schedules/"
        );
    }

    #[test]
    fn schedules_endpoint_encodes_every_filter() {
        assert_eq!(
            schedules_endpoint(Some(" Primary On/Call "), Some("T1"), Some(3)).unwrap(),
            "/api/v1/schedules/?name=Primary%20On%2FCall&team_id=T1&page=3"
        );
    }

    #[test]
    fn schedules_endpoint_rejects_blank_filters() {
        assert!(schedules_endpoint(Some("  "), None, None).is_err());
        assert!(schedules_endpoint(None, Some(""), None).is_err());
    }

    #[test]
    fn escalation_endpoint_scopes_policies_to_one_chain() {
        assert_eq!(
            escalation_endpoint("F5CD4B2G3H", None).unwrap(),
            "/api/v1/escalation_policies/?escalation_chain_id=F5CD4B2G3H"
        );
        assert_eq!(
            escalation_endpoint("F5CD4B2G3H", Some(2)).unwrap(),
            "/api/v1/escalation_policies/?escalation_chain_id=F5CD4B2G3H&page=2"
        );
    }

    #[test]
    fn escalation_endpoint_rejects_a_blank_chain_id() {
        assert!(escalation_endpoint("   ", None).is_err());
    }

    #[test]
    fn oncall_endpoints_never_interpolate_a_path_segment_from_input() {
        let endpoint = escalation_endpoint("../../admin/users", None).unwrap();
        let (path, query) = endpoint.split_once('?').expect("query string");
        assert_eq!(path, "/api/v1/escalation_policies/");
        assert!(!query.contains('/'), "{}", query);
    }

    #[test]
    fn every_oncall_endpoint_stays_under_its_declared_path_prefix() {
        let endpoints = [
            schedules_endpoint(Some("x/y"), Some("t/z"), Some(1)).unwrap(),
            escalation_endpoint("a/b", Some(1)).unwrap(),
        ];
        for endpoint in endpoints {
            let path = endpoint.split('?').next().unwrap();
            assert!(
                path == "/api/v1/schedules/" || path == "/api/v1/escalation_policies/",
                "unexpected path: {}",
                path
            );
        }
    }
}
