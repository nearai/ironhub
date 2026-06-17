# {{domain_name}}

Top-level domain (for example Work, Personal, Side Projects). No frontmatter needed; tasks and entities point here.

## Open tasks in this domain

```dataview
TABLE WITHOUT ID file.link AS Task, entities, project, due, status
FROM "Tasks"
WHERE domain = [[{{domain_name}}]] AND status != "done"
SORT due ASC
```

## Entities in this domain

```dataview
LIST
FROM "Entities"
WHERE domain = [[{{domain_name}}]]
```
