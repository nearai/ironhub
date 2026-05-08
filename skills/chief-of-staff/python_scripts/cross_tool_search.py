"""Cross-tool search workflow.

Unified search across the bundled tool surfaces. Returns hits grouped
by system, ordered by recency within each, capped per system to keep
the response one screen.

Tools used: gmail, google-drive, github, gitlab, clickup.

Inputs:
    query (str): The search term. Plain text; surface-specific syntax
        is added by this script per tool.
    workspace_id (str): ClickUp workspace id.
    github_orgs (list[str]): GitHub orgs to scope code and issue
        search. An empty list disables GitHub search.
    gitlab_groups (list[str]): GitLab groups to scope. Empty list
        disables GitLab search.
    drive_folder_id (str | None): Optional Drive folder to scope.
    since_days (int): Lookback window. Default 30.
    limit_per_system (int): Cap per surface. Default 5.

Output: dict with keys `query`, `gmail`, `drive`, `github`, `gitlab`,
`clickup`, `generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ironclaw.runtime import tools


def _validate(query: str, workspace_id: str, since_days: int, limit_per_system: int) -> None:
    if not query or not query.strip():
        raise ValueError("query is required")
    if not workspace_id:
        raise ValueError("workspace_id is required")
    if since_days <= 0:
        raise ValueError("since_days must be positive")
    if limit_per_system <= 0 or limit_per_system > 50:
        raise ValueError("limit_per_system must be between 1 and 50")


def _search_gmail(query: str, since_days: int, limit: int) -> list[dict[str, Any]]:
    since = (datetime.now(timezone.utc) - timedelta(days=since_days)).isoformat()[:10]
    response = tools.gmail.list_messages(
        query=f"{query} after:{since}", max_results=limit
    )
    hits: list[dict[str, Any]] = []
    for ref in response.get("messages", [])[:limit]:
        msg = tools.gmail.get_message(message_id=ref["id"])
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        hits.append(
            {
                "id": msg.get("id"),
                "thread_id": msg.get("threadId"),
                "subject": headers.get("subject", "(no subject)"),
                "from": headers.get("from"),
                "snippet": msg.get("snippet", ""),
                "date": headers.get("date"),
            }
        )
    return hits


def _drive_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def _search_drive(query: str, drive_folder_id: str | None, limit: int) -> list[dict[str, Any]]:
    parts = [f"fullText contains '{_drive_escape(query)}'"]
    if drive_folder_id:
        parts.append(f"'{_drive_escape(drive_folder_id)}' in parents")
    parts.append("trashed = false")
    response = tools.google_drive.list_files(
        q=" and ".join(parts),
        page_size=limit,
        order_by="modifiedTime desc",
        fields="files(id,name,mimeType,webViewLink,modifiedTime,owners)",
    )
    return [
        {
            "id": f.get("id"),
            "name": f.get("name"),
            "mime_type": f.get("mimeType"),
            "url": f.get("webViewLink"),
            "modified": f.get("modifiedTime"),
            "owners": [o.get("emailAddress") for o in f.get("owners", [])],
        }
        for f in response.get("files", [])
    ]


def _search_github(query: str, github_orgs: list[str], limit: int) -> list[dict[str, Any]]:
    if not github_orgs:
        return []
    org_qualifier = " ".join(f"org:{org}" for org in github_orgs)
    response = tools.github.search_issues_pull_requests(
        query=f"{query} {org_qualifier}", limit=limit
    )
    return [
        {
            "title": item.get("title"),
            "url": item.get("html_url"),
            "type": "pr" if item.get("pull_request") else "issue",
            "repo": item.get("repository_url", "").split("/")[-1],
            "state": item.get("state"),
            "updated_at": item.get("updated_at"),
        }
        for item in response.get("items", [])[:limit]
    ]


def _search_gitlab(query: str, gitlab_groups: list[str], limit: int) -> list[dict[str, Any]]:
    if not gitlab_groups:
        return []
    hits: list[dict[str, Any]] = []
    for group in gitlab_groups:
        issue_hits = tools.gitlab.search_issues(
            project=group, query=query, per_page=limit, page=1
        )
        for item in issue_hits[:limit]:
            hits.append(
                {
                    "title": item.get("title"),
                    "url": item.get("web_url"),
                    "type": "issue",
                    "project": item.get("references", {}).get("full"),
                    "state": item.get("state"),
                    "updated_at": item.get("updated_at"),
                }
            )
        if len(hits) >= limit:
            break
    return hits[:limit]


def _search_clickup(query: str, workspace_id: str, limit: int) -> list[dict[str, Any]]:
    response = tools.clickup.list_filtered_team_tasks(
        workspace_id=workspace_id, include_closed=True
    )
    matches: list[dict[str, Any]] = []
    q_lower = query.lower()
    for task in response.get("tasks", []):
        haystack = (task.get("name", "") + " " + task.get("description", "")).lower()
        if q_lower in haystack:
            matches.append(
                {
                    "id": task.get("id"),
                    "name": task.get("name"),
                    "status": task.get("status", {}).get("status"),
                    "url": task.get("url"),
                    "list": task.get("list", {}).get("name"),
                    "updated_ms": task.get("date_updated"),
                }
            )
    matches.sort(key=lambda m: m.get("updated_ms") or "0", reverse=True)
    return matches[:limit]


def run(
    *,
    query: str,
    workspace_id: str,
    github_orgs: list[str] | None = None,
    gitlab_groups: list[str] | None = None,
    drive_folder_id: str | None = None,
    since_days: int = 30,
    limit_per_system: int = 5,
) -> dict[str, Any]:
    _validate(query, workspace_id, since_days, limit_per_system)
    github_orgs = github_orgs or []
    gitlab_groups = gitlab_groups or []

    return {
        "query": query,
        "gmail": _search_gmail(query, since_days, limit_per_system),
        "drive": _search_drive(query, drive_folder_id, limit_per_system),
        "github": _search_github(query, github_orgs, limit_per_system),
        "gitlab": _search_gitlab(query, gitlab_groups, limit_per_system),
        "clickup": _search_clickup(query, workspace_id, limit_per_system),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
