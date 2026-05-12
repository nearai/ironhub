"""Weekly digest workflow.

Cross-platform recap of the past N days covering shipped work, stalled
work, decisions made, partner pulse, and next-week setup. Default
trigger is end-of-week; the user reviews and forwards to leadership or
the board chair.

Tools used: github, gitlab, clickup, gmail, google-docs,
google-calendar.

Inputs:
    workspace_id (str): ClickUp workspace id.
    user_assignee_id (int): ClickUp user id for the executive.
    github_orgs (list[str]): GitHub organizations to summarize.
    gitlab_groups (list[str]): GitLab group paths to summarize.
    decision_log_doc_id (str): Google Doc id of the decision log.
    partners (list[str]): Partner names or domains to track.
    days_back (int): Window length in days. Default 7.

Output: dict with keys `shipped`, `stalled`, `decisions`,
`partner_pulse`, `next_week`, `generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ironclaw.runtime import tools


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def _validate(workspace_id: str, github_orgs: list[str], gitlab_groups: list[str]) -> None:
    if not workspace_id:
        raise ValueError("workspace_id is required")
    if not isinstance(github_orgs, list) or not isinstance(gitlab_groups, list):
        raise ValueError("github_orgs and gitlab_groups must be lists")


def _fetch_shipped(
    github_orgs: list[str], gitlab_groups: list[str], window_start: datetime
) -> list[dict[str, Any]]:
    shipped: list[dict[str, Any]] = []
    iso_since = _iso(window_start)

    for org in github_orgs:
        merged = tools.github.search_issues_pull_requests(
            query=f"is:pr is:merged org:{org} merged:>={iso_since[:10]}",
            limit=50,
        )
        for item in merged.get("items", []):
            shipped.append(
                {
                    "platform": "github",
                    "repo": item.get("repository_url", "").split("/")[-1],
                    "title": item.get("title"),
                    "author": item.get("user", {}).get("login"),
                    "merged_at": item.get("closed_at"),
                    "url": item.get("html_url"),
                }
            )

    for group in gitlab_groups:
        mrs = tools.gitlab.list_merge_requests(
            project=group,
            state="merged",
            per_page=50,
            page=1,
        )
        for mr in mrs:
            merged_at = mr.get("merged_at")
            if not merged_at:
                continue
            if merged_at >= iso_since:
                shipped.append(
                    {
                        "platform": "gitlab",
                        "repo": mr.get("references", {}).get("full"),
                        "title": mr.get("title"),
                        "author": mr.get("author", {}).get("username"),
                        "merged_at": merged_at,
                        "url": mr.get("web_url"),
                    }
                )

    shipped.sort(key=lambda x: x.get("merged_at") or "", reverse=True)
    return shipped


def _fetch_stalled(
    github_orgs: list[str],
    gitlab_groups: list[str],
    workspace_id: str,
    pr_age_days: int = 5,
    task_age_days: int = 7,
) -> dict[str, Any]:
    pr_cutoff = datetime.now(timezone.utc) - timedelta(days=pr_age_days)
    stuck_prs: list[dict[str, Any]] = []

    for org in github_orgs:
        prs = tools.github.search_issues_pull_requests(
            query=f"is:pr is:open org:{org} updated:<={_iso(pr_cutoff)[:10]}",
            limit=50,
        )
        for item in prs.get("items", []):
            stuck_prs.append(
                {
                    "platform": "github",
                    "repo": item.get("repository_url", "").split("/")[-1],
                    "title": item.get("title"),
                    "author": item.get("user", {}).get("login"),
                    "last_activity": item.get("updated_at"),
                    "url": item.get("html_url"),
                }
            )

    for group in gitlab_groups:
        mrs = tools.gitlab.list_merge_requests(
            project=group, state="opened", per_page=50, page=1
        )
        for mr in mrs:
            updated = mr.get("updated_at", "")
            if updated and updated < _iso(pr_cutoff):
                stuck_prs.append(
                    {
                        "platform": "gitlab",
                        "repo": mr.get("references", {}).get("full"),
                        "title": mr.get("title"),
                        "author": mr.get("author", {}).get("username"),
                        "last_activity": updated,
                        "url": mr.get("web_url"),
                    }
                )

    blocked = tools.clickup.list_filtered_team_tasks(
        workspace_id=workspace_id,
        statuses=["blocked", "in progress"],
        include_closed=False,
        date_updated_lt=_ms(datetime.now(timezone.utc) - timedelta(days=task_age_days)),
    )
    stalled_tasks = [
        {
            "id": t.get("id"),
            "name": t.get("name"),
            "status": t.get("status", {}).get("status"),
            "list": t.get("list", {}).get("name"),
            "url": t.get("url"),
            "last_activity_ms": t.get("date_updated"),
        }
        for t in blocked.get("tasks", [])
    ]

    return {"open_prs": stuck_prs, "stalled_tasks": stalled_tasks}


def _fetch_decisions(decision_log_doc_id: str, window_start: datetime) -> list[dict[str, Any]]:
    if not decision_log_doc_id:
        return []
    doc = tools.google_docs.get_document(document_id=decision_log_doc_id)
    body = doc.get("body", {}).get("content", [])
    iso_since = _iso(window_start)
    entries: list[dict[str, Any]] = []
    for block in body:
        para = block.get("paragraph")
        if not para:
            continue
        text_runs = [
            run.get("textRun", {}).get("content", "")
            for run in para.get("elements", [])
        ]
        joined = "".join(text_runs).strip()
        if not joined:
            continue
        if joined.startswith("[") and "]" in joined:
            tag, _, rest = joined.partition("]")
            date_str = tag.lstrip("[")
            if date_str >= iso_since[:10]:
                entries.append({"date": date_str, "text": rest.strip()})
    return entries


def _fetch_partner_pulse(
    partners: list[str], window_start: datetime
) -> list[dict[str, Any]]:
    pulse: list[dict[str, Any]] = []
    iso_since = _iso(window_start)[:10]
    for partner in partners:
        inbound = tools.gmail.list_messages(
            query=f"from:({partner}) after:{iso_since}", max_results=20
        )
        outbound = tools.gmail.list_messages(
            query=f"to:({partner}) after:{iso_since}", max_results=20
        )
        pulse.append(
            {
                "partner": partner,
                "inbound_count": len(inbound.get("messages", [])),
                "outbound_count": len(outbound.get("messages", [])),
            }
        )
    return pulse


def _fetch_next_week(workspace_id: str, user_assignee_id: int) -> dict[str, Any]:
    next_week_start = datetime.now(timezone.utc) + timedelta(days=2)
    next_week_end = next_week_start + timedelta(days=7)
    cal = tools.google_calendar.list_events(
        calendar_id="primary",
        time_min=_iso(next_week_start),
        time_max=_iso(next_week_end),
        single_events=True,
        order_by="startTime",
    )
    upcoming = tools.clickup.list_filtered_team_tasks(
        workspace_id=workspace_id,
        assignees=[user_assignee_id],
        include_closed=False,
        due_date_lt=_ms(next_week_end),
    )
    return {
        "calendar_events": len(cal.get("items", [])),
        "tasks_due": len(upcoming.get("tasks", [])),
        "calendar_density_per_day": _density_by_day(cal.get("items", [])),
    }


def _density_by_day(events: list[dict[str, Any]]) -> dict[str, int]:
    by_day: dict[str, int] = {}
    for ev in events:
        start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date") or ""
        day = start[:10]
        by_day[day] = by_day.get(day, 0) + 1
    return by_day


def run(
    *,
    workspace_id: str,
    user_assignee_id: int,
    github_orgs: list[str],
    gitlab_groups: list[str],
    decision_log_doc_id: str = "",
    partners: list[str] | None = None,
    days_back: int = 7,
) -> dict[str, Any]:
    _validate(workspace_id, github_orgs, gitlab_groups)
    partners = partners or []
    window_start = datetime.now(timezone.utc) - timedelta(days=days_back)

    return {
        "shipped": _fetch_shipped(github_orgs, gitlab_groups, window_start),
        "stalled": _fetch_stalled(github_orgs, gitlab_groups, workspace_id),
        "decisions": _fetch_decisions(decision_log_doc_id, window_start),
        "partner_pulse": _fetch_partner_pulse(partners, window_start),
        "next_week": _fetch_next_week(workspace_id, user_assignee_id),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
