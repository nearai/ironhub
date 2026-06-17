---
domain: "[[{{domain}}]]"
entities:
  - "[[{{entity}}]]"
status: active
due:
---

# {{project_name}}

{{what_this_project_is}}

## Tasks in this project

```dataview
TABLE WITHOUT ID file.link AS Task, due, status
FROM "Tasks"
WHERE project = [[{{project_name}}]]
SORT status ASC, due ASC
```
