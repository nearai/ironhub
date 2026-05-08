"""Decision tracker workflow.

Captures a structured decision in the configured Google Doc and creates
a tagged ClickUp task for downstream visibility. Replays decisions on
demand for board prep, retros, and audits.

Tools used: google-docs, clickup.

Inputs:
    decision_log_doc_id (str): Google Doc id of the append-only log.
    decision_text (str): One-sentence statement of the decision.
    rationale (str): One-sentence reasoning behind the decision.
    owner (str): Named individual or team accountable.
    affected_artifacts (list[str]): URLs of related artifacts (PRs,
        tasks, threads). Optional.
    workspace_id (str | None): ClickUp workspace id. Required when
        clickup_list_id is provided.
    clickup_list_id (str | None): If set, also create a tagged ClickUp
        task. Optional.
    approved (bool): When True, append and create. When False, return
        the draft only.
    mode (str): "append" to log a new decision (default); "list" to
        return prior decisions in a window.
    list_since_days (int): Window for "list" mode. Default 30.

Output for `mode="append"`: dict with keys `decision`, `appended`,
`task`, `executed`, `generated_at`.

Output for `mode="list"`: dict with keys `mode`, `entries`,
`generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ironclaw.runtime import tools


def _validate_append(
    decision_log_doc_id: str,
    decision_text: str,
    rationale: str,
    owner: str,
) -> None:
    if not decision_log_doc_id:
        raise ValueError("decision_log_doc_id is required")
    if not decision_text or len(decision_text) > 500:
        raise ValueError("decision_text is required and must be at most 500 characters")
    if not rationale or len(rationale) > 500:
        raise ValueError("rationale is required and must be at most 500 characters")
    if not owner:
        raise ValueError("owner is required")


def _format_entry(
    decision_text: str,
    rationale: str,
    owner: str,
    affected_artifacts: list[str],
) -> str:
    today = datetime.now(timezone.utc).date().isoformat()
    artifacts_block = ""
    if affected_artifacts:
        artifacts_block = "\nReferences:\n" + "\n".join(f"- {a}" for a in affected_artifacts)
    return (
        f"[{today}] {decision_text}\n"
        f"Rationale: {rationale}\n"
        f"Owner: {owner}{artifacts_block}\n\n"
    )


def _append_to_doc(decision_log_doc_id: str, entry: str) -> dict[str, Any]:
    doc = tools.google_docs.get_document(document_id=decision_log_doc_id)
    body = doc.get("body", {}).get("content", [])
    end_index = max((seg.get("endIndex", 1) for seg in body), default=1)
    return tools.google_docs.batch_update(
        document_id=decision_log_doc_id,
        requests=[
            {
                "insertText": {
                    "location": {"index": max(end_index - 1, 1)},
                    "text": entry,
                }
            }
        ],
    )


def _create_tracker_task(
    workspace_id: str,
    clickup_list_id: str,
    decision_text: str,
    rationale: str,
    owner: str,
    affected_artifacts: list[str],
) -> dict[str, Any]:
    body_lines = [
        f"Decision: {decision_text}",
        f"Rationale: {rationale}",
        f"Owner: {owner}",
    ]
    if affected_artifacts:
        body_lines.append("References:")
        body_lines.extend(f"- {a}" for a in affected_artifacts)
    return tools.clickup.create_task(
        list_id=clickup_list_id,
        name=f"Decision: {decision_text}",
        description="\n".join(body_lines),
        tags=["decision"],
    )


def _list_recent(decision_log_doc_id: str, list_since_days: int) -> list[dict[str, Any]]:
    if not decision_log_doc_id:
        raise ValueError("decision_log_doc_id is required")
    doc = tools.google_docs.get_document(document_id=decision_log_doc_id)
    body = doc.get("body", {}).get("content", [])
    cutoff = (datetime.now(timezone.utc) - timedelta(days=list_since_days)).date().isoformat()

    paragraphs: list[str] = []
    for block in body:
        para = block.get("paragraph")
        if not para:
            continue
        joined = "".join(
            run.get("textRun", {}).get("content", "")
            for run in para.get("elements", [])
        ).rstrip("\n")
        if joined:
            paragraphs.append(joined)

    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line in paragraphs:
        if line.startswith("[") and "]" in line:
            tag, _, rest = line.partition("]")
            date_str = tag.lstrip("[")
            if current and current.get("date", "") >= cutoff:
                entries.append(current)
            current = {"date": date_str, "decision": rest.strip(), "rationale": "", "owner": ""}
        elif current is not None:
            if line.startswith("Rationale:"):
                current["rationale"] = line.split(":", 1)[1].strip()
            elif line.startswith("Owner:"):
                current["owner"] = line.split(":", 1)[1].strip()
    if current and current.get("date", "") >= cutoff:
        entries.append(current)
    return entries


def run(
    *,
    decision_log_doc_id: str = "",
    decision_text: str = "",
    rationale: str = "",
    owner: str = "",
    affected_artifacts: list[str] | None = None,
    workspace_id: str | None = None,
    clickup_list_id: str | None = None,
    approved: bool = False,
    mode: str = "append",
    list_since_days: int = 30,
) -> dict[str, Any]:
    affected_artifacts = affected_artifacts or []

    if mode == "list":
        entries = _list_recent(decision_log_doc_id, list_since_days)
        return {
            "mode": "list",
            "entries": entries,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    if mode != "append":
        raise ValueError(f"mode must be 'append' or 'list'; got {mode!r}")

    _validate_append(decision_log_doc_id, decision_text, rationale, owner)
    entry = _format_entry(decision_text, rationale, owner, affected_artifacts)

    draft = {
        "doc_id": decision_log_doc_id,
        "entry_text": entry,
        "task": {
            "list_id": clickup_list_id,
            "workspace_id": workspace_id,
        }
        if clickup_list_id
        else None,
    }

    if not approved:
        return {
            "decision": draft,
            "appended": None,
            "task": None,
            "executed": False,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    appended = _append_to_doc(decision_log_doc_id, entry)
    task_result: dict[str, Any] | None = None
    if clickup_list_id and workspace_id:
        task_result = _create_tracker_task(
            workspace_id,
            clickup_list_id,
            decision_text,
            rationale,
            owner,
            affected_artifacts,
        )

    return {
        "decision": draft,
        "appended": appended,
        "task": task_result,
        "executed": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
