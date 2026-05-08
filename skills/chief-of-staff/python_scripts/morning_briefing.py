"""Morning briefing workflow.

Pulls the current state across calendar, email, tasks, and code review
queues and returns a structured one-screen summary.

Tools used: google-calendar, gmail, clickup, github, gitlab.

Inputs:
    workspace_id (str): ClickUp workspace id.
    user_assignee_id (int): ClickUp user id for the executive.
    user_email (str): Gmail address of the executive. The domain is
        used to flag external attendees on calendar events.
    github_user (str | None): GitHub login for review-requested queries.
    gitlab_user_id (int | None): GitLab user id for review-requested
        queries. Requires gitlab_projects to be non-empty.
    gitlab_projects (list[str] | None): GitLab project slugs or numeric
        ids to scan for review-requested merge requests. The v1 GitLab
        tool does not expose a workspace-wide MR query, so reviewers
        are computed per project.
    hours_ahead (int): Calendar window in hours from now. Default 8.
    inbox_top_n (int): Email cap. Default 5.

Output: dict with keys `calendar`, `important_emails`, `due_tasks`,
`review_queue`, `generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ironclaw.runtime import tools


def _ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def _validate(workspace_id: str, user_assignee_id: int, user_email: str) -> None:
    if not workspace_id:
        raise ValueError("workspace_id is required")
    if not isinstance(user_assignee_id, int) or user_assignee_id <= 0:
        raise ValueError("user_assignee_id must be a positive integer")
    if not user_email or "@" not in user_email:
        raise ValueError("user_email must be a valid address")


def _fetch_calendar(hours_ahead: int, user_domain: str) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=hours_ahead)
    response = tools.google_calendar.list_events(
        calendar_id="primary",
        time_min=now.isoformat(),
        time_max=end.isoformat(),
        single_events=True,
        order_by="startTime",
    )
    items = response.get("items", []) if isinstance(response, dict) else []
    return [
        {
            "id": event.get("id"),
            "summary": event.get("summary", "(no title)"),
            "start": event.get("start", {}).get("dateTime")
            or event.get("start", {}).get("date"),
            "end": event.get("end", {}).get("dateTime")
            or event.get("end", {}).get("date"),
            "location": event.get("location"),
            "attendees": [
                {
                    "email": a.get("email"),
                    "response": a.get("responseStatus"),
                    "optional": a.get("optional", False),
                }
                for a in event.get("attendees", [])
            ],
            "has_external_attendees": any(
                a.get("email", "").split("@")[-1].lower() != user_domain
                for a in event.get("attendees", [])
                if a.get("email")
            ),
        }
        for event in items
    ]


def _fetch_important_emails(top_n: int) -> list[dict[str, Any]]:
    query = "is:unread -category:promotions -category:social newer_than:1d"
    response = tools.gmail.list_messages(query=query, max_results=top_n * 3)
    threads_seen: set[str] = set()
    important: list[dict[str, Any]] = []
    for msg_ref in response.get("messages", []):
        thread_id = msg_ref.get("threadId")
        if thread_id in threads_seen:
            continue
        threads_seen.add(thread_id)
        msg = tools.gmail.get_message(message_id=msg_ref["id"])
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        important.append(
            {
                "id": msg.get("id"),
                "thread_id": thread_id,
                "from": headers.get("from", ""),
                "subject": headers.get("subject", "(no subject)"),
                "snippet": msg.get("snippet", ""),
                "received": headers.get("date", ""),
                "has_explicit_ask": _has_explicit_ask(msg.get("snippet", "")),
            }
        )
        if len(important) >= top_n:
            break
    return important


def _has_explicit_ask(snippet: str) -> bool:
    markers = ("?", "please", "could you", "can you", "need", "by ")
    lowered = snippet.lower()
    return any(m in lowered for m in markers)


def _fetch_due_tasks(workspace_id: str, user_assignee_id: int) -> list[dict[str, Any]]:
    end_of_today = datetime.now(timezone.utc).replace(
        hour=23, minute=59, second=59, microsecond=0
    )
    response = tools.clickup.list_filtered_team_tasks(
        workspace_id=workspace_id,
        assignees=[user_assignee_id],
        statuses=[],
        include_closed=False,
        due_date_lt=_ms(end_of_today),
    )
    tasks = response.get("tasks", []) if isinstance(response, dict) else []
    return [
        {
            "id": task.get("id"),
            "name": task.get("name"),
            "status": task.get("status", {}).get("status"),
            "due_date": task.get("due_date"),
            "url": task.get("url"),
            "list": task.get("list", {}).get("name"),
            "blocked": task.get("status", {}).get("status", "").lower() == "blocked",
        }
        for task in tasks
    ]


def _fetch_review_queue(
    github_user: str | None,
    gitlab_user_id: int | None,
    gitlab_projects: list[str],
) -> dict[str, list[dict[str, Any]]]:
    github_prs: list[dict[str, Any]] = []
    if github_user:
        gh_resp = tools.github.search_issues_pull_requests(
            query=f"is:pr is:open review-requested:{github_user}",
            limit=20,
        )
        github_prs = [
            {
                "title": item.get("title"),
                "url": item.get("html_url"),
                "author": item.get("user", {}).get("login"),
                "repo": item.get("repository_url", "").split("/")[-1],
                "updated_at": item.get("updated_at"),
            }
            for item in gh_resp.get("items", [])
        ]

    gitlab_mrs: list[dict[str, Any]] = []
    if gitlab_user_id and gitlab_projects:
        for project in gitlab_projects:
            gl_resp = tools.gitlab.list_merge_requests(
                project=project,
                state="opened",
                per_page=20,
                page=1,
            )
            for mr in gl_resp:
                reviewers = mr.get("reviewers") or []
                if any(r.get("id") == gitlab_user_id for r in reviewers):
                    gitlab_mrs.append(
                        {
                            "title": mr.get("title"),
                            "url": mr.get("web_url"),
                            "author": mr.get("author", {}).get("username"),
                            "project": mr.get("references", {}).get("full"),
                            "updated_at": mr.get("updated_at"),
                        }
                    )

    return {"github": github_prs, "gitlab": gitlab_mrs}


def run(
    *,
    workspace_id: str,
    user_assignee_id: int,
    user_email: str,
    github_user: str | None = None,
    gitlab_user_id: int | None = None,
    gitlab_projects: list[str] | None = None,
    hours_ahead: int = 8,
    inbox_top_n: int = 5,
) -> dict[str, Any]:
    _validate(workspace_id, user_assignee_id, user_email)
    user_domain = user_email.rsplit("@", 1)[-1].lower()
    gitlab_projects = gitlab_projects or []

    return {
        "calendar": _fetch_calendar(hours_ahead, user_domain),
        "important_emails": _fetch_important_emails(inbox_top_n),
        "due_tasks": _fetch_due_tasks(workspace_id, user_assignee_id),
        "review_queue": _fetch_review_queue(github_user, gitlab_user_id, gitlab_projects),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
