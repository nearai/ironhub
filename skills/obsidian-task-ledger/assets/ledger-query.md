# Task Ledger

The centralized ledger. Drop these queries into a note (for example `Ledger.md`). They render live from the task notes; nothing is maintained by hand. Requires the Dataview plugin (or adapt to Bases). All queries read the `Tasks/` folder, so task notes need no marker tag.

## Everything open, by domain

```dataview
TABLE WITHOUT ID file.link AS Task, entities, project, due
FROM "Tasks"
WHERE status != "done"
GROUP BY domain
SORT due ASC
```

## Due today or overdue

```dataview
TABLE WITHOUT ID file.link AS Task, domain, entities, due
FROM "Tasks"
WHERE status != "done" AND due AND due <= date(today)
SORT due ASC
```

## This week

```dataview
TABLE WITHOUT ID file.link AS Task, domain, entities, due, status
FROM "Tasks"
WHERE status != "done" AND due AND due <= date(today) + dur(7 days)
SORT due ASC
```

## In progress

```dataview
TABLE WITHOUT ID file.link AS Task, domain, entities, due
FROM "Tasks"
WHERE status = "doing"
SORT due ASC
```

## Blocked

```dataview
TABLE WITHOUT ID file.link AS Task, domain, entities
FROM "Tasks"
WHERE status = "blocked"
```
