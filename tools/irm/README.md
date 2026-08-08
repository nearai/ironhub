# Grafana IRM

Read access to incidents in [Grafana IRM](https://grafana.com/docs/grafana-cloud/alerting-and-irm/irm/)
via the [Incident API](https://grafana.com/docs/grafana-cloud/alerting-and-irm/irm/reference/incident-api/),
a JSON RPC surface served by the IRM app on your Grafana instance, cloud or self-hosted.

The tool is read-only. It declares, updates, and resolves nothing.

Pairs with the `grafana` tool: same stack, same service account token, same
`grafana/host` workspace file. Use `grafana` for what is firing, `irm` for what was
declared, who responded, and what happened.

## Actions

| Action | RPC method | Purpose |
|---|---|---|
| `list_incidents` | `IncidentsService.QueryIncidents` | Recent incidents, newest first by default |
| `get_incident` | `IncidentsService.GetIncident` | One incident by ID, with severity, status, and roles |
| `get_timeline` | `ActivityService.QueryActivity` | The incident activity feed |
| `list_fields` | `FieldsService.GetFields` | Custom incident metadata fields on the stack |

Every call is a `POST` to
`/api/plugins/grafana-irm-app/resources/api/v1/{Service}.{Method}` with a JSON body.

## The timeline is the useful part

`get_timeline` returns the activity feed, which is where the investigation narrative
lives: status changes, severity changes, notes people wrote, and automated events. For
"what actually happened during this incident", it beats the incident record itself.

Filter it with `activity_kind` to separate human notes from machine events, and with
`tag` to pull a single labelled slice:

```json
{
  "action": "get_timeline",
  "incident_id": "1a2b3c",
  "activity_kind": ["userNote"],
  "limit": 50
}
```

## Auth and hostname

Grafana IRM runs on your Grafana instance, so it uses the same credential and the same
host configuration as the `grafana` tool.

Before installing, replace `YOUR_GRAFANA_HOST` in the capabilities file in both places
(`allowlist.host` and the credential's `host_patterns`) with your Grafana hostname, the
same one you gave the `grafana` tool. Then store the token:

```sh
export GRAFANA_SERVICE_ACCOUNT_TOKEN=<service account token>
```

The hostname is read from the workspace file `grafana/host`, shared with the `grafana`
tool, as a bare hostname with an optional port. The host injects the token as an
`Authorization: Bearer` header; the token is never visible to the tool.

## Limits

- **On-call is not covered.** Schedules, who is on call now, and escalation policies are
  served by Grafana OnCall, which uses a separate deployment-specific base URL (found on
  the OnCall Settings page) and an `X-Grafana-URL` header rather than the stack host. That
  surface needs a live stack to pin down and will land as a follow-up.
- Write methods exist on this API (`CreateIncident`, `UpdateStatus`, `UpdateSeverity`,
  `AssignRole`, `AddActivity`) and are deliberately not exposed.
- The query surface is intentionally minimal: `limit` and `orderDirection` for incidents,
  plus `tag` and `activityKind` for activity. Additional documented filters exist and will
  be added once they can be verified against a live stack.
- One host per installation, pinned in the capabilities file at install time.
