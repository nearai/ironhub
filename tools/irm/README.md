# Grafana IRM

Read access to incidents and on-call rotations in
[Grafana IRM](https://grafana.com/docs/grafana-cloud/alerting-and-irm/irm/), cloud or
self-hosted.

The tool is read-only. It declares, updates, resolves, and pages nobody.

Pairs with the `grafana` tool: same stack, same service account token, same
`grafana/host` workspace file. Use `grafana` for what is firing, `irm` for what was
declared, who responded, what happened, and who to reach.

## Actions

Incidents, via the
[Incident API](https://grafana.com/docs/grafana-cloud/alerting-and-irm/irm/reference/incident-api/),
a JSON RPC surface served by the IRM app on your Grafana instance:

| Action | RPC method | Purpose |
|---|---|---|
| `list_incidents` | `IncidentsService.QueryIncidents` | Recent incidents, newest first by default |
| `get_incident` | `IncidentsService.GetIncident` | One incident by ID, with severity, status, and roles |
| `get_timeline` | `ActivityService.QueryActivity` | The incident activity feed |
| `list_fields` | `FieldsService.GetFields` | Custom incident metadata fields on the stack |

Every one is a `POST` to
`/api/plugins/grafana-irm-app/resources/api/v1/{Service}.{Method}` with a JSON body.

On-call, via the [OnCall API](https://grafana.com/docs/oncall/latest/oncall-api-reference/),
a REST surface on its own host:

| Action | Endpoint | Purpose |
|---|---|---|
| `list_on_call` | `GET /api/v1/schedules/` | Schedules with their `on_call_now` membership, filterable by `schedule_name` and `team_id` |
| `list_escalation_chains` | `GET /api/v1/escalation_chains/` | The chains to choose from |
| `get_escalation_policy` | `GET /api/v1/escalation_policies/` | Ordered escalation steps for one chain, by required `escalation_chain_id` |

Chain IDs are not guessable, so discovery is its own action rather than a mode of
`get_escalation_policy`. Folding both into one action would let a caller ask for a policy,
receive a list of chains, and report chains as though they were the policy.

All three on-call endpoints are paginated. Pass `page` to walk them; the response carries
`count`, `next`, and `total_pages`.

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

## Auth and hostnames

This tool talks to two APIs with two credentials, because Grafana serves them that way.

**Incidents.** Grafana IRM runs on your Grafana instance, so it reuses the credential and
host configuration of the `grafana` tool. Replace `YOUR_GRAFANA_HOST` in the capabilities
file in both places (`allowlist.host` and the credential's `host_patterns`) with your
Grafana hostname, then store the token:

```sh
export GRAFANA_SERVICE_ACCOUNT_TOKEN=<service account token>
```

The hostname is read from the workspace file `grafana/host`, shared with the `grafana`
tool. The host injects the token as `Authorization: Bearer`.

**On-call.** Grafana OnCall has its own base URL and its own token. Open OnCall, go to
Settings, and read the API URL shown there. Replace `YOUR_ONCALL_HOST` in the capabilities
file in all four places (three allowlist entries and the credential's `host_patterns`),
write the same hostname to the workspace file `grafana/oncall_host`, and store the token:

```sh
export GRAFANA_ONCALL_API_TOKEN=<oncall api token>
```

The host injects this one as a bare `Authorization` header with **no `Bearer` prefix**,
which is what the OnCall API expects and why it cannot share the incident credential.

On a self-hosted deployment the two hostnames are normally the same value. Grafana Cloud
serves OnCall from a regional hostname instead, which is why it has to be configured
rather than derived.

Neither token is ever visible to the tool. Both are injected host-side, scoped by host and
path prefix.

That path scoping is load-bearing when the two hostnames are the same. The OnCall
allowlist names three exact prefixes rather than all of `/api/v1/`, because Grafana's own
alert provisioning API lives at `/api/v1/provisioning` on the same host and belongs to the
`grafana` tool. A broad prefix would hand this tool a surface it has no reason to reach.

## Limits

- **The on-call actions need their own credential.** Configure only the Grafana service
  account token and the incident actions work while `list_on_call` and
  `get_escalation_policy` return a clear "token not configured" error. That is the intended
  behaviour, not a partial install.
- **`on_call_now` is a point-in-time answer.** It reflects the rotation at the moment of
  the call. For a historical or future window, `GET /api/v1/schedules/<id>/final_shifts`
  exists and is not exposed here; it needs an explicit date range and belongs in its own
  action rather than as a mode of this one.
- Write methods exist on both APIs (`CreateIncident`, `UpdateStatus`, `UpdateSeverity`,
  `AssignRole`, `AddActivity` on incidents; create, update, and delete across schedules,
  chains, and policies on OnCall) and are deliberately not exposed.
- The incident query surface is intentionally minimal: `limit` and `orderDirection`, plus
  `tag` and `activityKind` for activity. Additional documented filters exist and will be
  added once they can be verified against a live stack.
- The OnCall list endpoints filter on what the API actually accepts, which is `name` and
  `team_id` for schedules and `escalation_chain_id` for policies. There is no free-text
  search and no server-side "who is on call for this alert" lookup.
- One Grafana host and one OnCall host per installation, pinned in the capabilities file
  at install time.
