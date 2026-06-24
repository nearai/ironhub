# wazuh.invoke

Execute a single Wazuh read or control action. Pass an `action` field plus
that action's fields in `params`. The input schema is a tagged union keyed on
`action`; only the fields listed for the chosen action are read.

## Actions

Indexer (OpenSearch) read actions:

- `search_alerts` (optional `hours_back`, `min_rule_level`, `agent_name`, `size`)
- `search_vulnerabilities` (optional `severity` of low, medium, high, critical, plus `agent_name`, `size`)
- `top_alert_rules` (optional `hours_back`, `size`)
- `cluster_health`
- `list_indices`

Server API actions:

- `list_agents` (optional `status` of active, disconnected, pending, never_connected)
- `agent_summary`
- `restart_agent` (`agent_id`)
- `add_agent` (`name`, optional `ip`)
- `remove_agent` (`agent_id`, optional `purge`)
- `move_agent_to_group` (`agent_id`, `group`)
- `trigger_active_response` (optional `agent_id`, `command`, optional `arguments`; omit `agent_id` to push to the whole fleet)
- `restart_manager`
- `update_cdb_list` (`list_name`, `content`)

## Auth

Authentication is host-injected. The Wazuh indexer password and the Wazuh
server API password are HTTP Basic credentials supplied by the host; you do not
pass them in `params`. Server API actions exchange the Basic credential for a
short-lived token before each call. Control actions (restart, add, remove,
move, trigger_active_response, restart_manager, update_cdb_list) mutate the
monitored fleet, so confirm intent before invoking them.
