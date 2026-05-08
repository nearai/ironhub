"""Document review workflow.

Fetches a Google Doc, Sheet, or Slides deck, returns a structured
representation suitable for downstream summarization, and proposes
follow-up tasks for the executive's review.

This script does not produce the natural-language summary itself.
Summarization is the LLM's job; this script extracts the document's
content into a deterministic shape so the summary is grounded in real
text rather than the LLM's recall of the URL. It also drafts the
follow-up artifacts; nothing is filed without explicit approval.

Tools used: google-docs, google-sheets, google-slides, clickup.

Inputs:
    document_id (str): The Google document id.
    document_type (str): "doc" | "sheet" | "slides".
    follow_up_destination (str): "clickup" only in v1. Reserved for
        future expansion.
    workspace_id (str | None): ClickUp workspace id. Required when
        any follow-up task creation is requested.
    clickup_list_id (str | None): ClickUp list id for follow-up tasks.
        Required when proposed_actions is non-empty and approved is
        True.
    proposed_actions (list[dict] | None): Action items the caller
        wants filed as ClickUp tasks. Each dict has keys `name`,
        `description`, `assignees` (list[int], optional),
        `due_date_ms` (int, optional). Optional; the caller may
        supply none and just receive the document content.
    approved (bool): When True, file the proposed actions. When
        False, return drafts only.

Output: dict with keys `document_type`, `content`, `metadata`,
`task_drafts`, `task_results`, `executed`, `generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ironclaw.runtime import tools

VALID_TYPES = {"doc", "sheet", "slides"}


def _validate(document_id: str, document_type: str) -> None:
    if not document_id:
        raise ValueError("document_id is required")
    if document_type not in VALID_TYPES:
        raise ValueError(
            f"document_type must be one of {sorted(VALID_TYPES)}; got {document_type!r}"
        )


def _read_doc(document_id: str) -> dict[str, Any]:
    doc = tools.google_docs.get_document(document_id=document_id)
    paragraphs: list[str] = []
    headings: list[dict[str, Any]] = []
    for block in doc.get("body", {}).get("content", []):
        para = block.get("paragraph")
        if not para:
            continue
        text = "".join(
            run.get("textRun", {}).get("content", "")
            for run in para.get("elements", [])
        ).rstrip("\n")
        if not text:
            continue
        style = para.get("paragraphStyle", {}).get("namedStyleType", "")
        if style.startswith("HEADING_"):
            headings.append({"level": style, "text": text})
        paragraphs.append(text)
    return {
        "title": doc.get("title", ""),
        "paragraphs": paragraphs,
        "headings": headings,
        "revision_id": doc.get("revisionId"),
    }


def _read_sheet(document_id: str) -> dict[str, Any]:
    sheet = tools.google_sheets.get_spreadsheet(spreadsheet_id=document_id)
    sheets_meta = [
        {
            "title": s.get("properties", {}).get("title"),
            "id": s.get("properties", {}).get("sheetId"),
            "row_count": s.get("properties", {}).get("gridProperties", {}).get("rowCount"),
            "column_count": s.get("properties", {}).get("gridProperties", {}).get("columnCount"),
        }
        for s in sheet.get("sheets", [])
    ]
    samples: list[dict[str, Any]] = []
    for s in sheets_meta[:3]:
        title = s.get("title") or "Sheet1"
        sample_range = f"{title}!A1:J20"
        values = tools.google_sheets.get_values(
            spreadsheet_id=document_id, range=sample_range
        )
        samples.append({"sheet": title, "range": sample_range, "values": values.get("values", [])})
    return {
        "title": sheet.get("properties", {}).get("title", ""),
        "sheets": sheets_meta,
        "samples": samples,
    }


def _read_slides(document_id: str) -> dict[str, Any]:
    deck = tools.google_slides.get_presentation(presentation_id=document_id)
    slides: list[dict[str, Any]] = []
    for slide in deck.get("slides", []):
        text_pieces: list[str] = []
        for el in slide.get("pageElements", []):
            shape = el.get("shape")
            if not shape:
                continue
            text = shape.get("text", {})
            for elt in text.get("textElements", []):
                run = elt.get("textRun")
                if run:
                    text_pieces.append(run.get("content", "").rstrip("\n"))
        slides.append({"slide_id": slide.get("objectId"), "text": "\n".join(text_pieces).strip()})
    return {
        "title": deck.get("title", ""),
        "slide_count": len(slides),
        "slides": slides,
    }


def _draft_tasks(
    proposed_actions: list[dict[str, Any]],
    clickup_list_id: str | None,
    workspace_id: str | None,
) -> list[dict[str, Any]]:
    drafts: list[dict[str, Any]] = []
    for action in proposed_actions:
        if not action.get("name"):
            raise ValueError("each proposed action requires a name")
        drafts.append(
            {
                "list_id": clickup_list_id,
                "workspace_id": workspace_id,
                "name": action["name"],
                "description": action.get("description", ""),
                "assignees": action.get("assignees", []),
                "due_date_ms": action.get("due_date_ms"),
            }
        )
    return drafts


def _file_task(draft: dict[str, Any]) -> dict[str, Any]:
    return tools.clickup.create_task(
        list_id=draft["list_id"],
        name=draft["name"],
        description=draft["description"],
        assignees=draft["assignees"],
        due_date=draft["due_date_ms"],
        due_date_time=bool(draft["due_date_ms"]),
    )


def run(
    *,
    document_id: str,
    document_type: str,
    follow_up_destination: str = "clickup",
    workspace_id: str | None = None,
    clickup_list_id: str | None = None,
    proposed_actions: list[dict[str, Any]] | None = None,
    approved: bool = False,
) -> dict[str, Any]:
    _validate(document_id, document_type)
    if follow_up_destination != "clickup":
        raise ValueError("follow_up_destination must be 'clickup' in v1")
    proposed_actions = proposed_actions or []
    if proposed_actions and (not clickup_list_id or not workspace_id):
        raise ValueError(
            "proposed_actions requires both clickup_list_id and workspace_id"
        )

    if document_type == "doc":
        content = _read_doc(document_id)
    elif document_type == "sheet":
        content = _read_sheet(document_id)
    else:
        content = _read_slides(document_id)

    drafts = _draft_tasks(proposed_actions, clickup_list_id, workspace_id)

    result: dict[str, Any] = {
        "document_type": document_type,
        "content": content,
        "metadata": {"document_id": document_id},
        "task_drafts": drafts,
        "task_results": [],
        "executed": False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if not approved or not drafts:
        return result

    result["executed"] = True
    for draft in drafts:
        result["task_results"].append(_file_task(draft))
    return result
