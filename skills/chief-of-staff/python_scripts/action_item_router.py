"""Action item router workflow.

Converts a verbal or written action item into the correct destination
artifact: GitHub issue, GitLab issue, ClickUp task, or Calendar event.
Drafts the artifact, optionally executes after explicit approval.

Tools used: github, gitlab, clickup, google-calendar.

Inputs:
    action_text (str): The action item as the user expressed it.
    destination (str): "github" | "gitlab" | "clickup" | "calendar".
        Required; the routing decision belongs to the caller (LLM or
        agent), not this script.
    approved (bool): When True, execute the side effect. When False,
        return the draft only. Defaults to False.
    owner (str | int | None): Assignee. Type depends on destination
        (GitHub login, GitLab user id, ClickUp assignee id, Calendar
        attendee email).
    due_date (int | str | None): Unix milliseconds for ClickUp; ISO-8601
        for Calendar; ignored elsewhere.
    repo (str | None): Required for github destination
        ("owner/repo"). Required for gitlab destination (project slug
        or numeric id).
    workspace_id (str | None): Required for ClickUp destination.
    list_id (str | None): Required for ClickUp destination.
    calendar_id (str): Default "primary". Used only for Calendar.
    cross_references (list[str]): Optional list of URLs or identifiers
        that get linked from the artifact body.

Output: dict with keys `destination`, `draft`, `executed`, `result`,
`generated_at`. When `approved=False`, `executed` is False and
`result` is None.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ironclaw.runtime import tools

VALID_DESTINATIONS = {"github", "gitlab", "clickup", "calendar"}


def _validate(destination: str, action_text: str) -> None:
    if destination not in VALID_DESTINATIONS:
        raise ValueError(
            f"destination must be one of {sorted(VALID_DESTINATIONS)}; got {destination!r}"
        )
    if not action_text or not action_text.strip():
        raise ValueError("action_text must be non-empty")


def _build_body(action_text: str, cross_references: list[str]) -> str:
    body = action_text.strip()
    if cross_references:
        refs = "\n".join(f"- {ref}" for ref in cross_references)
        body += f"\n\nReferences:\n{refs}"
    return body


def _draft_github(
    action_text: str,
    repo: str,
    owner: str | None,
    cross_references: list[str],
) -> dict[str, Any]:
    if not repo or "/" not in repo:
        raise ValueError("github destination requires repo in 'owner/repo' form")
    parts = repo.split("/", 1)
    return {
        "destination": "github",
        "owner_namespace": parts[0],
        "repo": parts[1],
        "title": _summarize_title(action_text),
        "body": _build_body(action_text, cross_references),
        "assignee": owner,
    }


def _draft_gitlab(
    action_text: str,
    project: str,
    owner: int | None,
    cross_references: list[str],
) -> dict[str, Any]:
    if not project:
        raise ValueError("gitlab destination requires project (slug or numeric id)")
    return {
        "destination": "gitlab",
        "project": project,
        "title": _summarize_title(action_text),
        "description": _build_body(action_text, cross_references),
        "assignee_id": owner,
    }


def _draft_clickup(
    action_text: str,
    list_id: str,
    workspace_id: str,
    owner: int | None,
    due_date_ms: int | None,
    cross_references: list[str],
) -> dict[str, Any]:
    if not list_id:
        raise ValueError("clickup destination requires list_id")
    if not workspace_id:
        raise ValueError("clickup destination requires workspace_id")
    return {
        "destination": "clickup",
        "list_id": list_id,
        "workspace_id": workspace_id,
        "name": _summarize_title(action_text),
        "description": _build_body(action_text, cross_references),
        "assignees": [owner] if owner else [],
        "due_date": due_date_ms,
    }


def _draft_calendar(
    action_text: str,
    calendar_id: str,
    owner: str | None,
    due_iso: str | None,
    cross_references: list[str],
) -> dict[str, Any]:
    if not due_iso:
        raise ValueError("calendar destination requires due_date as ISO-8601 datetime")
    return {
        "destination": "calendar",
        "calendar_id": calendar_id,
        "summary": _summarize_title(action_text),
        "description": _build_body(action_text, cross_references),
        "start": due_iso,
        "attendees": [owner] if owner else [],
    }


def _summarize_title(action_text: str) -> str:
    first_line = action_text.strip().splitlines()[0].strip()
    if len(first_line) > 90:
        return first_line[:87].rstrip() + "..."
    return first_line


def _execute(draft: dict[str, Any]) -> dict[str, Any]:
    dest = draft["destination"]
    if dest == "github":
        return tools.github.create_issue(
            owner=draft["owner_namespace"],
            repo=draft["repo"],
            title=draft["title"],
            body=draft["body"],
            assignees=[draft["assignee"]] if draft["assignee"] else [],
        )
    if dest == "gitlab":
        return tools.gitlab.create_issue(
            project=draft["project"],
            title=draft["title"],
            description=draft["description"],
            assignee_ids=[draft["assignee_id"]] if draft["assignee_id"] else [],
        )
    if dest == "clickup":
        return tools.clickup.create_task(
            list_id=draft["list_id"],
            name=draft["name"],
            description=draft["description"],
            assignees=draft["assignees"],
            due_date=draft["due_date"],
            due_date_time=bool(draft["due_date"]),
        )
    if dest == "calendar":
        return tools.google_calendar.create_event(
            calendar_id=draft["calendar_id"],
            summary=draft["summary"],
            description=draft["description"],
            start={"dateTime": draft["start"]},
            attendees=[{"email": a} for a in draft["attendees"] if a],
        )
    raise ValueError(f"unknown destination at execute time: {dest}")


def run(
    *,
    action_text: str,
    destination: str,
    approved: bool = False,
    owner: str | int | None = None,
    due_date: int | str | None = None,
    repo: str | None = None,
    workspace_id: str | None = None,
    list_id: str | None = None,
    calendar_id: str = "primary",
    cross_references: list[str] | None = None,
) -> dict[str, Any]:
    _validate(destination, action_text)
    cross_references = cross_references or []

    if destination == "github":
        draft = _draft_github(action_text, repo or "", owner if isinstance(owner, str) else None, cross_references)
    elif destination == "gitlab":
        draft = _draft_gitlab(action_text, repo or "", owner if isinstance(owner, int) else None, cross_references)
    elif destination == "clickup":
        due_ms = due_date if isinstance(due_date, int) else None
        draft = _draft_clickup(
            action_text,
            list_id or "",
            workspace_id or "",
            owner if isinstance(owner, int) else None,
            due_ms,
            cross_references,
        )
    else:
        due_iso = due_date if isinstance(due_date, str) else None
        draft = _draft_calendar(
            action_text,
            calendar_id,
            owner if isinstance(owner, str) else None,
            due_iso,
            cross_references,
        )

    if not approved:
        return {
            "destination": destination,
            "draft": draft,
            "executed": False,
            "result": None,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    result = _execute(draft)
    return {
        "destination": destination,
        "draft": draft,
        "executed": True,
        "result": result,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
