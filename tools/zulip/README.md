# Zulip

Read access to a Zulip realm, cloud or self-hosted, via the [Zulip REST API](https://zulip.com/api/rest).
Fetches messages by narrow filter, reads channels and their topics, follows an incremental
cursor through new messages, and lists realm members.

The tool is read-only. It sends, edits, and reacts to nothing.

## Actions

| Action | Method + path | Purpose |
|---|---|---|
| `search_messages` | `GET /api/v1/messages` | Fetch messages filtered by narrow operators |
| `fetch_since` | `GET /api/v1/messages` | Everything after a known message ID |
| `list_streams` | `GET /api/v1/streams` | Channels visible to the bot, with stream IDs |
| `list_topics` | `GET /api/v1/users/me/{stream_id}/topics` | Topics in one channel |
| `list_users` | `GET /api/v1/users` | Realm members |

## Narrows are the whole query language

Zulip does not have separate endpoints for "messages in a channel" or "messages from a
person". Everything is `GET /messages` plus a **narrow**: an array of
`{operator, operand}` filters, combined with AND.

```json
{
  "action": "search_messages",
  "narrow": [
    { "operator": "channel", "operand": "engineering" },
    { "operator": "topic", "operand": "release 2.13" }
  ],
  "num_before": 100
}
```

A thread is a channel plus a topic, which is why there is no separate `get_thread` action:
pass both operators. Useful operators include `channel`, `topic`, `sender`, `search`
(full-text), `has` (`link`, `image`, `attachment`), and `is` (`unread`, `mentioned`). Set
`negated: true` on a filter to exclude rather than include.

`anchor` decides where in history the window sits: `newest`, `oldest`, `first_unread`, or a
message ID. `num_before` and `num_after` size the window either side of it.

## Incremental sync

`fetch_since` is the cursor-shaped read: give it the highest message ID you have already
processed and it returns what came after, anchored there with `num_before=0`. Persist the
largest `id` from each response and pass it back on the next call.

```json
{ "action": "fetch_since", "after_message_id": 41235, "limit": 200 }
```

## Auth and hostname

Zulip authenticates over HTTP Basic, where the **bot email is the username** and the API
key is the password. Because the bot email differs per deployment, it is pinned in the
capabilities file rather than passed per call.

Before installing, edit the capabilities file and replace:

- `YOUR_ZULIP_HOST` in `allowlist.host` and the credential's `host_patterns`
- `YOUR_ZULIP_BOT_EMAIL` in the credential's Basic `username`

Then store the key and the hostname:

```sh
export ZULIP_API_KEY=<bot api key>
```

```
zulip/host  ->  myorg.zulipchat.com
```

The host performs the `username:key` join and the base64 encoding at the egress boundary.
The tool never sees the API key, and never sees the assembled header.

## Limits

- **Subscription scopes visibility.** Zulip grants message access by subscription, so the
  bot only reads channels it has been subscribed to. A private channel nobody added it to
  stays invisible, and that is a Zulip permission boundary, not a tool limitation.
- One realm and one bot identity per installation, both pinned in the capabilities file.
- `search_messages` returns at most 5000 messages per call; page with `anchor` and
  `num_before` / `num_after`.
- Zulip Cloud rate-limits per user; the tool declares 120 requests/minute to stay under it.
- Self-hosted realms must be reachable over HTTPS with a certificate the IronClaw host
  trusts.
