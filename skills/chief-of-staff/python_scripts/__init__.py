"""Chief-of-staff canonical workflows for the IronClaw agent.

Each module in this package implements one of the canonical workflows
documented in `../SKILL.md`. The mission engine invokes these by name;
each module exposes a single `run(**kwargs) -> dict` entry point.

The runtime tool-dispatch surface is imported as
`from ironclaw.runtime import tools`. That import path is provisional
pending validation against the Reborn engine API. Workflow logic does
not depend on that path; retargeting is a single-line change at the
top of each module if the import path moves.

All write actions in this package require an explicit `approved=True`
flag from the caller. The skill's approval-tier discipline is enforced
inside each module, not at the engine boundary alone.
"""

from .action_item_router import run as run_action_item_router
from .cross_tool_search import run as run_cross_tool_search
from .decision_tracker import run as run_decision_tracker
from .document_review import run as run_document_review
from .morning_briefing import run as run_morning_briefing
from .pre_call_prep import run as run_pre_call_prep
from .status_broadcast import run as run_status_broadcast
from .weekly_digest import run as run_weekly_digest

__all__ = [
    "run_action_item_router",
    "run_cross_tool_search",
    "run_decision_tracker",
    "run_document_review",
    "run_morning_briefing",
    "run_pre_call_prep",
    "run_status_broadcast",
    "run_weekly_digest",
]
