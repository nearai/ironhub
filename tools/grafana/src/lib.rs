mod api;
mod grafana;
mod types;

use types::GrafanaAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct GrafanaTool;

impl exports::near::agent::tool::Guest for GrafanaTool {
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
        let schema = schemars::schema_for!(types::GrafanaAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Grafana read access, for Grafana Cloud and self-hosted alike. Actions: list_alerts \
         (alert instances currently firing, \
         pending, silenced, or inhibited, with optional label matchers such as \
         severity=critical), list_alert_rules (configured alert rule definitions), \
         get_alert_rule (one rule by UID), search_dashboards (find dashboards or folders by \
         title and tag), get_dashboard (full dashboard JSON by UID), list_datasources \
         (configured data sources with their UIDs), query_metrics (run a PromQL expression \
         against a Prometheus-compatible data source over a time range), fetch_since \
         (annotations recorded in a time window, which is where Grafana logs alert state \
         transitions, for incremental reads from a stored cursor). Read-only: this tool \
         creates, edits, and deletes nothing. The Grafana hostname is read from the workspace \
         file grafana/host and the service account token is injected by the host."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: GrafanaAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!(
                "grafana-tool parameter parse failed: {} | raw={}",
                e, params
            ),
        );
        format!(
            "Invalid parameters for grafana tool: {}. Expected shape: {{\"action\": \"<name>\", \
             ...fields}}. Valid action names: list_alerts, list_alert_rules, get_alert_rule, \
             search_dashboards, get_dashboard, list_datasources, query_metrics, fetch_since. \
             kind must be one of: dashboard, folder for search_dashboards, or alert, annotation \
             for fetch_since. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Grafana action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        GrafanaAction::ListAlerts {
            active,
            silenced,
            inhibited,
            filter,
        } => api::list_alerts(active, silenced, inhibited, &filter)?,
        GrafanaAction::ListAlertRules => api::list_alert_rules()?,
        GrafanaAction::GetAlertRule { uid } => api::get_alert_rule(&uid)?,
        GrafanaAction::SearchDashboards {
            query,
            tag,
            kind,
            limit,
            page,
        } => api::search_dashboards(query.as_deref(), &tag, kind, limit, page)?,
        GrafanaAction::GetDashboard { uid } => api::get_dashboard(&uid)?,
        GrafanaAction::ListDatasources => api::list_datasources()?,
        GrafanaAction::QueryMetrics {
            datasource_uid,
            expr,
            from,
            to,
            max_data_points,
        } => api::query_metrics(&datasource_uid, &expr, &from, &to, max_data_points)?,
        GrafanaAction::FetchSince {
            from_epoch_ms,
            to_epoch_ms,
            tags,
            kind,
            limit,
        } => api::fetch_since(from_epoch_ms, to_epoch_ms, &tags, kind, limit)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &GrafanaAction) -> &'static str {
    match action {
        GrafanaAction::ListAlerts { .. } => "list_alerts",
        GrafanaAction::ListAlertRules => "list_alert_rules",
        GrafanaAction::GetAlertRule { .. } => "get_alert_rule",
        GrafanaAction::SearchDashboards { .. } => "search_dashboards",
        GrafanaAction::GetDashboard { .. } => "get_dashboard",
        GrafanaAction::ListDatasources => "list_datasources",
        GrafanaAction::QueryMetrics { .. } => "query_metrics",
        GrafanaAction::FetchSince { .. } => "fetch_since",
    }
}

export!(GrafanaTool);
