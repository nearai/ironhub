---
kind: {{person_or_company_or_client}}
domain: "[[{{domain}}]]"
aliases: []
---

# {{entity_name}}

{{who_or_what_this_is}}

## Open tasks involving this entity

```dataview
TABLE WITHOUT ID file.link AS Task, project, due, status
FROM "Tasks"
WHERE contains(entities, [[{{entity_name}}]]) AND status != "done"
SORT due ASC
```
