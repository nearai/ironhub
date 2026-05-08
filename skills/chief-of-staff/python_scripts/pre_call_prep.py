"""Pre-call preparation workflow.

Gathers everything related to a counterparty across email, code, tasks,
and prior conversations. Produces a focused brief the user reads before
the call.

Tools used: gmail, github, gitlab, clickup.

Inputs:
    counterparty_name (str): Display name or partner label.
    counterparty_email (str | None): Primary email address.
    counterparty_domain (str | None): Email domain (used when an
        individual address is unknown but the org is).
    workspace_id (str): ClickUp workspace id.
    github_orgs (list[str]): GitHub orgs the counterparty might appear in.
    gitlab_groups (list[str]): GitLab groups the counterparty might appear in.
    days_back (int): Lookback window. Default 14.

Output: dict with keys `profile`, `recent_threads`, `open_work`,
`prior_followthroughs`, `talking_points`, `generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ironclaw.runtime import tools


def _iso_date(dt: datetime) -> str:
    return dt.isoformat()[:10]


def _validate(counterparty_name: str, counterparty_email: str | None, counterparty_domain: str | None) -> None:
    if not counterparty_name:
        raise ValueError("counterparty_name is required")
    if not counterparty_email and not counterparty_domain:
        raise ValueError("at least one of counterparty_email or counterparty_domain is required")


def _profile_from_threads(threads: list[dict[str, Any]]) -> dict[str, Any]:
    if not threads:
        return {"summary": "No prior interaction in the lookback window.", "thread_count": 0}
    return {
        "summary": (
            f"{len(threads)} email threads in the lookback window; "
            f"most recent activity {threads[0].get('last_message_at', 'unknown')}."
        ),
        "thread_count": len(threads),
        "most_recent": threads[0].get("subject"),
    }


def _fetch_recent_threads(
    counterparty_email: str | None,
    counterparty_domain: str | None,
    days_back: int,
) -> list[dict[str, Any]]:
    since = _iso_date(datetime.now(timezone.utc) - timedelta(days=days_back))
    target = counterparty_email or counterparty_domain
    query = f"from:({target}) OR to:({target}) after:{since}"
    response = tools.gmail.list_messages(query=query, max_results=50)
    threads_seen: dict[str, dict[str, Any]] = {}
    for ref in response.get("messages", []):
        thread_id = ref.get("threadId")
        if thread_id in threads_seen:
            continue
        msg = tools.gmail.get_message(message_id=ref["id"])
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        threads_seen[thread_id] = {
            "thread_id": thread_id,
            "subject": headers.get("subject", "(no subject)"),
            "from": headers.get("from"),
            "snippet": msg.get("snippet", ""),
            "last_message_at": headers.get("date"),
        }
    return sorted(
        threads_seen.values(),
        key=lambda t: t.get("last_message_at") or "",
        reverse=True,
    )


def _fetch_open_work(
    counterparty_name: str,
    counterparty_domain: str | None,
    workspace_id: str,
    github_orgs: list[str],
    gitlab_groups: list[str],
) -> dict[str, list[dict[str, Any]]]:
    open_work: dict[str, list[dict[str, Any]]] = {
        "tasks": [],
        "github_issues": [],
        "gitlab_issues": [],
    }

    tasks_resp = tools.clickup.list_filtered_team_tasks(
        workspace_id=workspace_id,
        include_closed=False,
    )
    name_lower = counterparty_name.lower()
    domain_lower = (counterparty_domain or "").lower()
    for t in tasks_resp.get("tasks", []):
        haystack = f"{t.get('name', '')} {t.get('description', '')}".lower()
        if name_lower in haystack or (domain_lower and domain_lower in haystack):
            open_work["tasks"].append(
                {
                    "id": t.get("id"),
                    "name": t.get("name"),
                    "status": t.get("status", {}).get("status"),
                    "url": t.get("url"),
                }
            )

    for org in github_orgs:
        issues = tools.github.search_issues_pull_requests(
            query=f"{counterparty_name} is:issue is:open org:{org}",
            limit=20,
        )
        for item in issues.get("items", []):
            open_work["github_issues"].append(
                {
                    "title": item.get("title"),
                    "url": item.get("html_url"),
                    "repo": item.get("repository_url", "").split("/")[-1],
                    "updated_at": item.get("updated_at"),
                }
            )

    for group in gitlab_groups:
        issues = tools.gitlab.list_issues(
            project=group, state="opened", per_page=20, page=1
        )
        for item in issues:
            haystack = f"{item.get('title', '')} {item.get('description', '')}".lower()
            if name_lower in haystack or (domain_lower and domain_lower in haystack):
                open_work["gitlab_issues"].append(
                    {
                        "title": item.get("title"),
                        "url": item.get("web_url"),
                        "project": item.get("references", {}).get("full"),
                        "updated_at": item.get("updated_at"),
                    }
                )

    return open_work


def _fetch_prior_followthroughs(
    counterparty_name: str,
    workspace_id: str,
    days_back: int,
) -> list[dict[str, Any]]:
    cutoff_ms = int((datetime.now(timezone.utc) - timedelta(days=days_back)).timestamp() * 1000)
    tasks_resp = tools.clickup.list_filtered_team_tasks(
        workspace_id=workspace_id,
        include_closed=True,
        date_created_gt=cutoff_ms,
    )
    name_lower = counterparty_name.lower()
    followthroughs: list[dict[str, Any]] = []
    for t in tasks_resp.get("tasks", []):
        haystack = f"{t.get('name', '')} {t.get('description', '')}".lower()
        if name_lower not in haystack:
            continue
        status = t.get("status", {}).get("status", "")
        followthroughs.append(
            {
                "name": t.get("name"),
                "status": status,
                "completed": status.lower() in {"complete", "closed", "done"},
                "url": t.get("url"),
            }
        )
    return followthroughs


def _derive_talking_points(
    threads: list[dict[str, Any]],
    open_work: dict[str, list[dict[str, Any]]],
    followthroughs: list[dict[str, Any]],
) -> list[str]:
    points: list[str] = []
    if threads:
        latest = threads[0]
        points.append(
            f"Acknowledge the most recent thread: {latest.get('subject')}"
        )
    incomplete = [f for f in followthroughs if not f.get("completed")]
    if incomplete:
        points.append(
            f"Status check on {len(incomplete)} prior commitments not yet closed."
        )
    if open_work["tasks"]:
        points.append(
            f"{len(open_work['tasks'])} open ClickUp tasks reference the counterparty."
        )
    code_count = len(open_work["github_issues"]) + len(open_work["gitlab_issues"])
    if code_count:
        points.append(
            f"{code_count} open issues across code repos mention the counterparty."
        )
    if not points:
        points.append("No active threads, work, or follow-throughs in the lookback window.")
    return points[:5]


def run(
    *,
    counterparty_name: str,
    counterparty_email: str | None = None,
    counterparty_domain: str | None = None,
    workspace_id: str,
    github_orgs: list[str] | None = None,
    gitlab_groups: list[str] | None = None,
    days_back: int = 14,
) -> dict[str, Any]:
    _validate(counterparty_name, counterparty_email, counterparty_domain)
    github_orgs = github_orgs or []
    gitlab_groups = gitlab_groups or []

    threads = _fetch_recent_threads(counterparty_email, counterparty_domain, days_back)
    open_work = _fetch_open_work(
        counterparty_name, counterparty_domain, workspace_id, github_orgs, gitlab_groups
    )
    followthroughs = _fetch_prior_followthroughs(counterparty_name, workspace_id, days_back)

    return {
        "profile": _profile_from_threads(threads),
        "recent_threads": threads[:10],
        "open_work": open_work,
        "prior_followthroughs": followthroughs,
        "talking_points": _derive_talking_points(threads, open_work, followthroughs),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
