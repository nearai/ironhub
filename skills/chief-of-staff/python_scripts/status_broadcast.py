"""Status broadcast workflow.

Pushes a status update to a stakeholder list via Gmail or WhatsApp,
choosing the right channel per recipient. Drafts everything first;
sends only on explicit approval.

Tools used: gmail, whatsapp.

Inputs:
    subject (str): Subject line for email recipients. Max 120 chars.
    body_email (str): Long-form body for email recipients.
    template_name (str | None): WhatsApp template to use for outside-
        the-window recipients. Required when whatsapp_recipients is
        non-empty and any recipient is outside the 24-hour window.
    template_language (str): Default "en_US".
    template_components (list[dict] | None): Per-recipient template
        parameter components, in WhatsApp's component shape. Optional;
        the template may have static body.
    whatsapp_recipients (list[dict]): Each entry has keys
        `phone_number_id` (the FROM phone), `to` (E.164), and optional
        `last_inbound_iso` (the recipient's last inbound timestamp,
        used to determine if free-form is allowed).
    email_recipients (list[str]): Email addresses for the long-form path.
    cc (list[str]): Email cc list. Optional.
    bcc (list[str]): Email bcc list. Optional.
    business_account_id (str | None): WhatsApp Business Account id
        used to validate template_name exists. Optional but recommended.
    approved (bool): When True, send. When False, return drafts only.

Output: dict with keys `email_drafts`, `whatsapp_drafts`,
`email_sends`, `whatsapp_sends`, `executed`, `generated_at`.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`; the path is provisional pending
the Reborn engine API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ironclaw.runtime import tools

WHATSAPP_FREE_FORM_WINDOW_HOURS = 24


def _validate(
    subject: str,
    body_email: str,
    email_recipients: list[str],
    whatsapp_recipients: list[dict[str, Any]],
    template_name: str | None,
) -> None:
    if not subject or len(subject) > 120:
        raise ValueError("subject is required and must be at most 120 characters")
    if not body_email or not body_email.strip():
        raise ValueError("body_email is required")
    if not email_recipients and not whatsapp_recipients:
        raise ValueError("at least one of email_recipients or whatsapp_recipients is required")
    for r in whatsapp_recipients:
        if not r.get("phone_number_id") or not r.get("to"):
            raise ValueError(
                "every whatsapp_recipients entry requires phone_number_id and to"
            )
    needs_template = any(
        not _within_window(r.get("last_inbound_iso")) for r in whatsapp_recipients
    )
    if needs_template and not template_name:
        raise ValueError(
            "template_name is required when any whatsapp recipient is outside the 24-hour free-form window"
        )


def _within_window(last_inbound_iso: str | None) -> bool:
    if not last_inbound_iso:
        return False
    try:
        last = datetime.fromisoformat(last_inbound_iso.replace("Z", "+00:00"))
    except ValueError:
        return False
    return datetime.now(timezone.utc) - last <= timedelta(hours=WHATSAPP_FREE_FORM_WINDOW_HOURS)


def _build_email_drafts(
    subject: str,
    body_email: str,
    email_recipients: list[str],
    cc: list[str],
    bcc: list[str],
) -> list[dict[str, Any]]:
    return [
        {
            "to": email_recipients,
            "cc": cc,
            "bcc": bcc,
            "subject": subject,
            "body": body_email,
        }
    ]


def _build_whatsapp_drafts(
    whatsapp_recipients: list[dict[str, Any]],
    body_email: str,
    template_name: str | None,
    template_language: str,
    template_components: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    drafts: list[dict[str, Any]] = []
    for r in whatsapp_recipients:
        within = _within_window(r.get("last_inbound_iso"))
        if within:
            drafts.append(
                {
                    "phone_number_id": r["phone_number_id"],
                    "to": r["to"],
                    "mode": "free_form",
                    "body": _shorten_for_whatsapp(body_email),
                }
            )
        else:
            drafts.append(
                {
                    "phone_number_id": r["phone_number_id"],
                    "to": r["to"],
                    "mode": "template",
                    "template_name": template_name,
                    "template_language": template_language,
                    "template_components": template_components,
                }
            )
    return drafts


def _shorten_for_whatsapp(body_email: str, limit: int = 800) -> str:
    cleaned = body_email.strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def _send_email(draft: dict[str, Any]) -> dict[str, Any]:
    return tools.gmail.send_message(
        to=draft["to"],
        cc=draft.get("cc", []),
        bcc=draft.get("bcc", []),
        subject=draft["subject"],
        body=draft["body"],
    )


def _send_whatsapp(draft: dict[str, Any]) -> dict[str, Any]:
    if draft["mode"] == "free_form":
        return tools.whatsapp.send_text(
            phone_number_id=draft["phone_number_id"],
            to=draft["to"],
            body=draft["body"],
        )
    return tools.whatsapp.send_template(
        phone_number_id=draft["phone_number_id"],
        to=draft["to"],
        template_name=draft["template_name"],
        language_code=draft["template_language"],
        components=draft.get("template_components"),
    )


def run(
    *,
    subject: str,
    body_email: str,
    template_name: str | None = None,
    template_language: str = "en_US",
    template_components: list[dict[str, Any]] | None = None,
    whatsapp_recipients: list[dict[str, Any]] | None = None,
    email_recipients: list[str] | None = None,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    business_account_id: str | None = None,
    approved: bool = False,
) -> dict[str, Any]:
    whatsapp_recipients = whatsapp_recipients or []
    email_recipients = email_recipients or []
    cc = cc or []
    bcc = bcc or []
    _validate(subject, body_email, email_recipients, whatsapp_recipients, template_name)

    if business_account_id and template_name:
        templates = tools.whatsapp.list_templates(
            business_account_id=business_account_id, name=template_name
        )
        if not templates.get("data"):
            raise ValueError(
                f"template {template_name!r} not found in business account {business_account_id}"
            )

    email_drafts = (
        _build_email_drafts(subject, body_email, email_recipients, cc, bcc)
        if email_recipients
        else []
    )
    whatsapp_drafts = _build_whatsapp_drafts(
        whatsapp_recipients,
        body_email,
        template_name,
        template_language,
        template_components,
    )

    result: dict[str, Any] = {
        "email_drafts": email_drafts,
        "whatsapp_drafts": whatsapp_drafts,
        "email_sends": [],
        "whatsapp_sends": [],
        "executed": False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if not approved:
        return result

    result["executed"] = True
    for draft in email_drafts:
        result["email_sends"].append(_send_email(draft))
    for draft in whatsapp_drafts:
        result["whatsapp_sends"].append(_send_whatsapp(draft))
    return result
