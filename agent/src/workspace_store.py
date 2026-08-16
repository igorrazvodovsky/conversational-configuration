"""Durable workspace store (docs/specs/agreement-workspace).

One JSON file per workspace under agent/data/workspaces/. A workspace is the
durable home of one installation's agreement — its configuration (choices,
candidate, frames) plus the conversations attached to it. Deliberately dumb
persistence: it never touches the solver or the product model, so callers pass
in the initial configuration. Last write wins; no locking (spec scope
decision).
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

_DEFAULT_DATA_DIR = Path(__file__).parent.parent / "data" / "workspaces"

# How many applied batches stay reversible (docs/specs/undo). Ten covers a long
# revision run and keeps the record readable by hand; anything a customer wants
# to hold past that is what a named frame is for.
HISTORY_DEPTH = 10


def data_dir() -> Path:
    """Where workspaces live. The scenario harness points WORKSPACE_STORE_DIR
    at a temp directory so a test run cannot write into the developer's own
    agreements (docs/specs/demo-scenarios design).

    Resolved per call, not at import: pytest imports every test module before
    deselecting any, so this module is already loaded by the time a scenario
    sets the variable.
    """
    override = os.environ.get("WORKSPACE_STORE_DIR")
    return Path(override) if override else _DEFAULT_DATA_DIR


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _path(workspace_id: str) -> Path:
    # ids are uuid4 hex we minted ourselves; reject anything path-like anyway
    if not workspace_id.isalnum():
        raise KeyError(f"no workspace {workspace_id!r}")
    return data_dir() / f"{workspace_id}.json"


def _read(path: Path) -> dict:
    return json.loads(path.read_text())


def _stamp(record: dict, thread_id: str | None = None) -> None:
    """Touch the record, and the conversation that moved it if it is one the
    workspace has registered."""
    now = _now()
    record["updatedAt"] = now
    for thread in record["threads"]:
        if thread["id"] == thread_id:
            thread["updatedAt"] = now


def _write(record: dict) -> None:
    data_dir().mkdir(parents=True, exist_ok=True)
    _path(record["id"]).write_text(json.dumps(record, indent=2))


def snapshot(configuration: dict) -> dict:
    """A configuration as history keeps it (docs/specs/undo): everything except
    `statuses`, which the solver re-derives on restore. Dropping the derived
    field is what makes "never copied blind" structural rather than a
    discipline — there is nothing to copy — and it is also by far the bulkiest
    key, one entry per value of every variable."""
    return {k: v for k, v in configuration.items() if k != "statuses"}


def _history(record: dict) -> dict:
    # .get: workspaces persisted before docs/specs/undo carry no history key
    return record.get("history") or {"past": [], "future": []}


def history_head(record: dict, direction: str) -> dict | None:
    """The snapshot a restore in `direction` would return to, or None when that
    end of the history is empty. Pure read over a record the caller already
    holds — the tool needs the record's own configuration anyway, to describe
    what the restore changes."""
    stack = _history(record)["past" if direction == "undo" else "future"]
    return stack[-1] if stack else None


def history_depths(record: dict) -> dict:
    """How many batches each way. Mirrored into agent state so the canvas can
    offer the controls without polling the store."""
    history = _history(record)
    return {"undo": len(history["past"]), "redo": len(history["future"])}


def create_workspace(configuration: dict) -> dict:
    # Workspaces are born unnamed; the agent names them from conversation
    # (rename_workspace) the way chat apps title conversations.
    record = {
        "id": uuid.uuid4().hex,
        "name": None,
        "configuration": configuration,
        "history": {"past": [], "future": []},
        "threads": [],
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    _write(record)
    return record


def rename_workspace(workspace_id: str, name: str) -> dict:
    name = name.strip()
    if not name:
        raise ValueError("workspace needs a non-empty name")
    record = get_workspace(workspace_id)
    record["name"] = name
    record["updatedAt"] = _now()
    _write(record)
    return record


def get_workspace(workspace_id: str) -> dict:
    path = _path(workspace_id)
    if not path.exists():
        raise KeyError(f"no workspace {workspace_id!r}")
    return _read(path)


def list_workspaces() -> list[dict]:
    if not data_dir().exists():
        return []
    records = [_read(p) for p in data_dir().glob("*.json")]
    return sorted(records, key=lambda r: r["updatedAt"], reverse=True)


def save_configuration(
    workspace_id: str, configuration: dict, thread_id: str | None = None
) -> dict:
    """Persist the agreement, and stamp the conversation that moved it.

    `thread_id` is how the frontend knows which conversation to open a
    workspace on: the last one to change the agreement is where the operator
    left off (docs/specs/agreement-workspace). A thread the workspace has not
    registered yet is ignored — registration happens on the conversation's
    first message and stamps it then.

    This is also where undo history is recorded (docs/specs/undo): every
    mutating tool reaches the store through here, so no tool can forget to
    keep one. The state being replaced joins the undo stack and the redo tail
    is discarded, both only when the configuration actually changed — dict
    equality is key-order independent, so a plain comparison is enough, and
    without the guard a no-op re-recording would burn a slot and leave an undo
    that visibly does nothing.
    """
    record = get_workspace(workspace_id)
    history = _history(record)
    if configuration != record["configuration"]:
        history = {
            "past": (history["past"] + [snapshot(record["configuration"])])[-HISTORY_DEPTH:],
            "future": [],
        }
    record["history"] = history
    record["configuration"] = configuration
    _stamp(record, thread_id)
    _write(record)
    return record


def commit_restore(
    workspace_id: str,
    direction: str,
    configuration: dict,
    thread_id: str | None = None,
) -> dict:
    """Move one step through the history (docs/specs/undo): the head of the
    named stack is consumed, and the state it replaces goes onto the other
    one, which is what makes undo itself undoable. Deliberately not
    `save_configuration` — a restore must not push its own target back onto
    the undo stack.

    `configuration` is the restored state, already re-validated through the
    solver by the caller; the store stays out of that.
    """
    record = get_workspace(workspace_id)
    history = _history(record)
    consumed, kept = ("past", "future") if direction == "undo" else ("future", "past")
    if not history[consumed]:
        raise ValueError(f"nothing to {direction}")
    record["history"] = {
        consumed: history[consumed][:-1],
        kept: history[kept] + [snapshot(record["configuration"])],
    }
    record["configuration"] = configuration
    _stamp(record, thread_id)
    _write(record)
    return record


def attach_rfq(workspace_id: str, document_text: str) -> dict:
    """Freeze the requirements document on the workspace record
    (docs/specs/rfq-reconciliation). The raw text is reference material, not
    working state: it never enters the shared configuration, and deleting
    every conversation leaves it untouched."""
    record = get_workspace(workspace_id)
    record["rfq_document"] = {"text": document_text, "ingestedAt": _now()}
    record["updatedAt"] = _now()
    _write(record)
    return record


def register_thread(workspace_id: str, thread_id: str) -> dict:
    """Attach a conversation to the workspace (idempotent)."""
    record = get_workspace(workspace_id)
    if not any(t["id"] == thread_id for t in record["threads"]):
        now = _now()
        # createdAt orders the conversation list; updatedAt is the last time
        # this conversation moved the agreement, and decides which one a
        # workspace opens on.
        record["threads"].append({"id": thread_id, "createdAt": now, "updatedAt": now})
        record["updatedAt"] = now
        _write(record)
    return record
