use crate::types::{AgentStatus, VulnerabilitySeverity};
use crate::wazuh::{
    append_query, authenticate_server_api, http_call, require_api_password,
    require_indexer_password, INDEXER_BASE, SERVER_BASE,
};

const SIZE_MAX: u32 = 100;
const ALERTS_INDEX_PATTERN: &str = "/wazuh-alerts-4.x-*/_search";
const VULNS_INDEX_PATTERN: &str = "/wazuh-states-vulnerabilities-*/_search";

pub fn search_alerts(
    hours_back: u32,
    min_rule_level: Option<u32>,
    agent_name: Option<&str>,
    size: u32,
) -> Result<serde_json::Value, String> {
    require_indexer_password()?;
    let payload = build_alerts_query(hours_back, min_rule_level, agent_name, clamp_size(size));
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize alerts query: {}", e))?;
    let (_, response) = http_call(
        "POST",
        INDEXER_BASE,
        ALERTS_INDEX_PATTERN,
        Some(&body),
        None,
    )?;
    Ok(response)
}

pub fn search_vulnerabilities(
    severity: Option<VulnerabilitySeverity>,
    agent_name: Option<&str>,
    size: u32,
) -> Result<serde_json::Value, String> {
    require_indexer_password()?;
    let payload = build_vulnerabilities_query(severity, agent_name, clamp_size(size));
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize vulnerabilities query: {}", e))?;
    let (_, response) = http_call("POST", INDEXER_BASE, VULNS_INDEX_PATTERN, Some(&body), None)?;
    Ok(response)
}

pub fn top_alert_rules(hours_back: u32, size: u32) -> Result<serde_json::Value, String> {
    require_indexer_password()?;
    let payload = build_top_rules_query(hours_back, clamp_size(size));
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize top rules query: {}", e))?;
    let (_, response) = http_call(
        "POST",
        INDEXER_BASE,
        ALERTS_INDEX_PATTERN,
        Some(&body),
        None,
    )?;
    Ok(response)
}

pub fn cluster_health() -> Result<serde_json::Value, String> {
    require_indexer_password()?;
    let (_, body) = http_call("GET", INDEXER_BASE, "/_cluster/health", None, None)?;
    Ok(body)
}

pub fn list_indices() -> Result<serde_json::Value, String> {
    require_indexer_password()?;
    let (_, body) = http_call(
        "GET",
        INDEXER_BASE,
        "/_cat/indices/wazuh-*?format=json",
        None,
        None,
    )?;
    Ok(body)
}

pub fn list_agents(status: Option<AgentStatus>) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let mut path = String::from("/agents");
    if let Some(s) = status {
        append_query(&mut path, "status", s.as_wazuh());
    }
    let (_, body) = http_call("GET", SERVER_BASE, &path, None, Some(&jwt))?;
    Ok(body)
}

pub fn agent_summary() -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let (_, body) = http_call("GET", SERVER_BASE, "/agents/stats", None, Some(&jwt))?;
    Ok(body)
}

pub fn restart_agent(agent_id: &str) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let path = format!("/agents/{}/restart", crate::wazuh::url_encode(agent_id));
    let (_, body) = http_call("PUT", SERVER_BASE, &path, None, Some(&jwt))?;
    Ok(body)
}

pub fn add_agent(name: &str, ip: Option<&str>) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let mut payload = serde_json::Map::new();
    payload.insert("name".into(), serde_json::Value::String(name.into()));
    if let Some(v) = ip {
        payload.insert("ip".into(), serde_json::Value::String(v.into()));
    }
    let body = serde_json::to_string(&serde_json::Value::Object(payload))
        .map_err(|e| format!("Failed to serialize add_agent body: {}", e))?;
    let (_, response) = http_call("POST", SERVER_BASE, "/agents", Some(&body), Some(&jwt))?;
    Ok(response)
}

pub fn remove_agent(agent_id: &str, purge: bool) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let mut path = String::from("/agents");
    append_query(&mut path, "agents_list", agent_id);
    append_query(&mut path, "older_than", "0s");
    append_query(&mut path, "purge", if purge { "true" } else { "false" });
    append_query(&mut path, "status", "all");
    let (_, body) = http_call("DELETE", SERVER_BASE, &path, None, Some(&jwt))?;
    Ok(body)
}

pub fn move_agent_to_group(agent_id: &str, group: &str) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let path = format!(
        "/agents/{}/group/{}",
        crate::wazuh::url_encode(agent_id),
        crate::wazuh::url_encode(group)
    );
    let (_, body) = http_call("PUT", SERVER_BASE, &path, None, Some(&jwt))?;
    Ok(body)
}

pub fn trigger_active_response(
    agent_id: Option<&str>,
    command: &str,
    arguments: &[String],
) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let payload = serde_json::json!({
        "command": command,
        "arguments": arguments,
        "alert": {}
    });
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize active_response body: {}", e))?;
    let mut path = String::from("/active-response");
    if let Some(id) = agent_id {
        append_query(&mut path, "agents_list", id);
    }
    let (_, response) = http_call("PUT", SERVER_BASE, &path, Some(&body), Some(&jwt))?;
    Ok(response)
}

pub fn restart_manager() -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let (_, body) = http_call("PUT", SERVER_BASE, "/manager/restart", None, Some(&jwt))?;
    Ok(body)
}

pub fn update_cdb_list(list_name: &str, content: &str) -> Result<serde_json::Value, String> {
    require_api_password()?;
    let jwt = authenticate_server_api()?;
    let mut path = format!("/lists/files/{}", crate::wazuh::url_encode(list_name));
    append_query(&mut path, "overwrite", "true");
    let (_, body) = http_call("PUT", SERVER_BASE, &path, Some(content), Some(&jwt))?;
    Ok(body)
}

fn build_alerts_query(
    hours_back: u32,
    min_rule_level: Option<u32>,
    agent_name: Option<&str>,
    size: u32,
) -> serde_json::Value {
    let mut must: Vec<serde_json::Value> = vec![time_range_clause(hours_back)];
    if let Some(level) = min_rule_level {
        must.push(serde_json::json!({
            "range": { "rule.level": { "gte": level } }
        }));
    }
    if let Some(name) = agent_name {
        must.push(serde_json::json!({
            "match": { "agent.name": name }
        }));
    }
    serde_json::json!({
        "size": size,
        "sort": [{ "@timestamp": { "order": "desc" } }],
        "query": { "bool": { "must": must } }
    })
}

fn build_vulnerabilities_query(
    severity: Option<VulnerabilitySeverity>,
    agent_name: Option<&str>,
    size: u32,
) -> serde_json::Value {
    let mut must: Vec<serde_json::Value> = Vec::new();
    if let Some(s) = severity {
        must.push(serde_json::json!({
            "term": { "vulnerability.severity": s.as_wazuh() }
        }));
    }
    if let Some(name) = agent_name {
        must.push(serde_json::json!({
            "match": { "agent.name": name }
        }));
    }
    let query = if must.is_empty() {
        serde_json::json!({ "match_all": {} })
    } else {
        serde_json::json!({ "bool": { "must": must } })
    };
    serde_json::json!({
        "size": size,
        "query": query
    })
}

fn build_top_rules_query(hours_back: u32, size: u32) -> serde_json::Value {
    serde_json::json!({
        "size": 0,
        "query": time_range_clause(hours_back),
        "aggs": {
            "top_rules": {
                "terms": { "field": "rule.description", "size": size }
            }
        }
    })
}

fn time_range_clause(hours_back: u32) -> serde_json::Value {
    serde_json::json!({
        "range": {
            "@timestamp": {
                "gte": format!("now-{}h", hours_back),
                "lte": "now"
            }
        }
    })
}

fn clamp_size(size: u32) -> u32 {
    size.clamp(1, SIZE_MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_caps_at_max() {
        assert_eq!(clamp_size(10_000), SIZE_MAX);
    }

    #[test]
    fn clamp_zero_becomes_one() {
        assert_eq!(clamp_size(0), 1);
    }

    #[test]
    fn time_range_uses_hours_back_token() {
        let clause = time_range_clause(6);
        let gte = clause["range"]["@timestamp"]["gte"].as_str().unwrap();
        assert_eq!(gte, "now-6h");
    }

    #[test]
    fn alerts_query_default_has_only_time_range() {
        let q = build_alerts_query(24, None, None, 20);
        assert_eq!(q["size"], serde_json::Value::Number(20.into()));
        let must = q["query"]["bool"]["must"].as_array().unwrap();
        assert_eq!(must.len(), 1);
        assert!(must[0].get("range").is_some());
    }

    #[test]
    fn alerts_query_includes_rule_level_and_agent() {
        let q = build_alerts_query(1, Some(12), Some("host-01"), 5);
        let must = q["query"]["bool"]["must"].as_array().unwrap();
        assert_eq!(must.len(), 3);
        assert_eq!(q["sort"][0]["@timestamp"]["order"], "desc");
    }

    #[test]
    fn vulnerabilities_query_match_all_when_no_filters() {
        let q = build_vulnerabilities_query(None, None, 20);
        assert!(q["query"].get("match_all").is_some());
    }

    #[test]
    fn vulnerabilities_query_term_severity() {
        let q = build_vulnerabilities_query(Some(VulnerabilitySeverity::Critical), None, 10);
        let must = q["query"]["bool"]["must"].as_array().unwrap();
        assert_eq!(must.len(), 1);
        assert_eq!(must[0]["term"]["vulnerability.severity"], "Critical");
    }

    #[test]
    fn vulnerabilities_query_combines_severity_and_agent() {
        let q = build_vulnerabilities_query(Some(VulnerabilitySeverity::High), Some("host-01"), 7);
        let must = q["query"]["bool"]["must"].as_array().unwrap();
        assert_eq!(must.len(), 2);
        assert_eq!(q["size"], serde_json::Value::Number(7.into()));
    }

    #[test]
    fn top_rules_query_has_zero_size_and_terms_agg() {
        let q = build_top_rules_query(12, 5);
        assert_eq!(q["size"], serde_json::Value::Number(0.into()));
        assert_eq!(q["aggs"]["top_rules"]["terms"]["field"], "rule.description");
        assert_eq!(q["aggs"]["top_rules"]["terms"]["size"], 5);
        let gte = q["query"]["range"]["@timestamp"]["gte"].as_str().unwrap();
        assert_eq!(gte, "now-12h");
    }
}
