# HubSpot

Read and write access to a HubSpot CRM via the v3 API. Use this to list, search,
fetch, create, update, and archive contacts, companies, deals, and tickets, and to
inspect lists, owners, and object properties.

## How to call

Pass a single `params` object with an `action` field naming the operation, plus that
action's fields. The input schema is a tagged union keyed on `action`, so only the
fields for the chosen action are valid.

Example:

```json
{ "action": "search_objects", "object_type": "deals", "query": "Acme", "limit": 25 }
```

## Actions

- `list_contacts` - page through contacts (`limit`, `properties`, `after`).
- `list_companies` - page through companies (`limit`, `properties`, `after`).
- `list_deals` - page through deals (`limit`, `properties`, `after`).
- `list_tickets` - page through tickets (`limit`, `properties`, `after`).
- `search_objects` - search one object type with a query or filter groups
  (`object_type`, `query`, `filter_groups`, `properties`, `limit`, `after`).
- `get_object` - fetch one object by id (`object_type`, `id`, `properties`).
- `create_object` - create an object (`object_type`, `properties`, `associations`).
- `update_object` - patch an object's properties (`object_type`, `id`, `properties`).
- `archive_object` - archive an object (`object_type`, `id`).
- `list_lists` - list contact lists (`limit`, `offset`, `query`).
- `get_list_members` - list members of a list (`list_id`, `limit`, `after`).
- `list_owners` - list CRM owners (`limit`, `after`, `email`, `archived`).
- `list_properties` - list property definitions for an object type
  (`object_type`, `archived`).
- `hubspot_request` - raw CRM v3 request for any endpoint not covered above
  (`method`, `path`, `body`). The path must start with `/crm/v3/`.

For object actions, `object_type` is one of `contacts`, `companies`, `deals`,
`tickets`. For `hubspot_request`, `method` is one of `GET`, `POST`, `PATCH`, `PUT`,
`DELETE`.

## Auth

Authentication is injected by the host. A HubSpot Private App or Service Key access
token is attached as an `Authorization: Bearer` header on requests to
`api.hubapi.com`. Do not include any token or credential in `params`.
