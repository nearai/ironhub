# Grafana

Read access to a Grafana instance, cloud or self-hosted, via the [Grafana HTTP API](https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/).
Reads alert instances that are currently firing, the alert rule definitions behind
them, dashboards and folders, configured data sources, and metric queries against a
Prometheus-compatible data source.

The tool is read-only. It creates, updates, and deletes nothing.

## Actions

| Action | Method + path | Purpose |
|---|---|---|
| `list_alerts` | `GET /api/alertmanager/grafana/api/v2/alerts` | Alert instances currently firing, pending, silenced, or inhibited |
| `list_alert_rules` | `GET /api/v1/provisioning/alert-rules` | All configured alert rule definitions |
| `get_alert_rule` | `GET /api/v1/provisioning/alert-rules/{uid}` | One alert rule by UID |
| `search_dashboards` | `GET /api/search` | Find dashboards and folders by title, tag, and kind |
| `get_dashboard` | `GET /api/dashboards/uid/{uid}` | Full dashboard JSON by UID |
| `list_datasources` | `GET /api/datasources` | Configured data sources and their UIDs |
| `query_metrics` | `POST /api/ds/query` | Run a PromQL expression over a time range |

## Alerts vs alert rules

These are different things and the distinction matters when investigating an incident.
`list_alerts` returns alert *instances*: what is actually firing right now, with labels,
annotations, and start times. `list_alert_rules` returns the *definitions*: the queries
and thresholds that decide when an instance fires. Start from `list_alerts` for "what is
broken", and `get_alert_rule` for "why did this fire".

`filter` on `list_alerts` takes Alertmanager label matchers, one per entry:

```json
{
  "action": "list_alerts",
  "filter": ["severity=critical", "namespace=rpc"]
}
```

## Querying metrics

`query_metrics` targets a Prometheus-compatible data source. Call `list_datasources`
first to get the `datasource_uid`; `expr` is PromQL, and `from` and `to` accept Grafana
relative times such as `now-6h` or epoch milliseconds.

```json
{
  "action": "query_metrics",
  "datasource_uid": "abc123",
  "expr": "sum(rate(http_requests_total[5m])) by (status)",
  "from": "now-6h",
  "to": "now"
}
```

## Target hostname

The tool works against Grafana Cloud and self-hosted Grafana. The hostname is pinned per
installation, in two places that must agree.

**1. The capabilities file, edited before install.** Replace `YOUR_GRAFANA_HOST` in both
`allowlist.host` and the credential's `host_patterns`:

```json
"host": "grafana.example.com"
```

This is the security boundary. It is enforced host-side, outside the sandbox, and a
request to any other host is refused before it leaves the runtime. That is why it is one
concrete host per install rather than a wildcard.

**2. The workspace file `grafana/host`,** which is what the tool reads to build request
URLs. Bare hostname, no scheme, no path; append a port if your instance uses one:

```
grafana.example.com:3000
```

Self-hosted instances must be reachable over HTTPS with a certificate the IronClaw host
trusts. For Grafana Cloud, use your stack hostname, `myorg.grafana.net`.

## Auth

Create a service account in Grafana under **Administration > Users and access > Service
accounts**, give it the **Viewer** role, and add a token. Viewer covers every action here;
nothing in this tool needs write permission.

```sh
export GRAFANA_SERVICE_ACCOUNT_TOKEN=<service account token>
```

The host injects the token as an `Authorization: Bearer` header on requests to
`*.grafana.net`. The token is never visible to the tool.

## Limits

- One host per installation. The allowlist is pinned to a single hostname, so an agent
  that needs to read two Grafana instances needs two installs.
- Assumes Grafana is served at the root of its host. An instance behind a sub-path such as
  `example.com/grafana/` needs the `path_prefix` in the capabilities file widened to match.
- `search_dashboards` caps at 5000 results per call; page with `limit` and `page`.
- `get_dashboard` returns the complete dashboard JSON, which can be large for dashboards
  with many panels.
- `query_metrics` sends a single PromQL query per call and assumes a Prometheus-compatible
  data source. Non-Prometheus data sources take different query fields and are not
  supported.
- `/api/dashboards/uid/{uid}` is the legacy dashboard route. Grafana 13 introduces
  `/apis/dashboard.grafana.app/` alongside it and keeps the legacy route operative.
