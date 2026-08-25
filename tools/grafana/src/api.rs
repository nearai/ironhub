use serde_json::{json, Value};

use crate::grafana::{append_query, get, post, require_non_empty, url_encode};
use crate::types::{AnnotationKind, SearchKind};

pub fn fetch_since(
    from_epoch_ms: u64,
    to_epoch_ms: Option<u64>,
    tags: &[String],
    kind: Option<AnnotationKind>,
    limit: u32,
) -> Result<Value, String> {
    if let Some(to) = to_epoch_ms {
        if to <= from_epoch_ms {
            return Err(format!(
                "`to_epoch_ms` ({}) must be greater than `from_epoch_ms` ({})",
                to, from_epoch_ms
            ));
        }
    }
    let mut endpoint = String::from("/api/annotations");
    append_query(&mut endpoint, "from", &from_epoch_ms.to_string());
    if let Some(to) = to_epoch_ms {
        append_query(&mut endpoint, "to", &to.to_string());
    }
    for tag in tags {
        append_query(&mut endpoint, "tags", tag);
    }
    if let Some(kind) = kind {
        append_query(&mut endpoint, "type", kind.as_grafana());
    }
    append_query(&mut endpoint, "limit", &limit.to_string());
    get(&endpoint)
}

pub fn list_alerts(
    active: bool,
    silenced: bool,
    inhibited: bool,
    filter: &[String],
) -> Result<Value, String> {
    let mut endpoint = String::from("/api/alertmanager/grafana/api/v2/alerts");
    append_query(&mut endpoint, "active", bool_param(active));
    append_query(&mut endpoint, "silenced", bool_param(silenced));
    append_query(&mut endpoint, "inhibited", bool_param(inhibited));
    for matcher in filter {
        append_query(&mut endpoint, "filter", matcher);
    }
    get(&endpoint)
}

pub fn list_alert_rules() -> Result<Value, String> {
    get("/api/v1/provisioning/alert-rules")
}

pub fn get_alert_rule(uid: &str) -> Result<Value, String> {
    require_non_empty(uid, "uid")?;
    get(&format!(
        "/api/v1/provisioning/alert-rules/{}",
        url_encode(uid)
    ))
}

pub fn search_dashboards(
    query: Option<&str>,
    tags: &[String],
    kind: Option<SearchKind>,
    limit: u32,
    page: u32,
) -> Result<Value, String> {
    let mut endpoint = String::from("/api/search");
    if let Some(term) = query {
        append_query(&mut endpoint, "query", term);
    }
    for tag in tags {
        append_query(&mut endpoint, "tag", tag);
    }
    if let Some(kind) = kind {
        append_query(&mut endpoint, "type", kind.as_grafana());
    }
    append_query(&mut endpoint, "limit", &limit.to_string());
    append_query(&mut endpoint, "page", &page.to_string());
    get(&endpoint)
}

pub fn get_dashboard(uid: &str) -> Result<Value, String> {
    require_non_empty(uid, "uid")?;
    get(&format!("/api/dashboards/uid/{}", url_encode(uid)))
}

pub fn list_datasources() -> Result<Value, String> {
    get("/api/datasources")
}

pub fn query_metrics(
    datasource_uid: &str,
    expr: &str,
    from: &str,
    to: &str,
    max_data_points: u32,
) -> Result<Value, String> {
    require_non_empty(datasource_uid, "datasource_uid")?;
    require_non_empty(expr, "expr")?;
    let body = json!({
        "from": from,
        "to": to,
        "queries": [{
            "refId": "A",
            "datasource": { "uid": datasource_uid },
            "expr": expr,
            "maxDataPoints": max_data_points,
        }],
    });
    post("/api/ds/query", &body)
}

fn bool_param(value: bool) -> &'static str {
    if value {
        "true"
    } else {
        "false"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bool_param_wire_values() {
        assert_eq!(bool_param(true), "true");
        assert_eq!(bool_param(false), "false");
    }

    #[test]
    fn get_alert_rule_rejects_blank_uid() {
        assert!(get_alert_rule("  ").is_err());
    }

    #[test]
    fn get_dashboard_rejects_blank_uid() {
        assert!(get_dashboard("").is_err());
    }

    #[test]
    fn query_metrics_rejects_blank_arguments() {
        assert!(query_metrics("", "up", "now-1h", "now", 100).is_err());
        assert!(query_metrics("ds1", "   ", "now-1h", "now", 100).is_err());
    }

    #[test]
    fn fetch_since_rejects_a_window_that_does_not_advance() {
        assert!(fetch_since(1000, Some(1000), &[], None, 100).is_err());
        assert!(fetch_since(2000, Some(1000), &[], None, 100).is_err());
    }
}
