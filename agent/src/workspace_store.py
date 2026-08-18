"""Durable workspace store (docs/specs/agreement-workspace,
docs/specs/parallel-drafts).

One JSON file per workspace under agent/data/workspaces/. A workspace is the
durable home of one installation's agreement, held as several *drafts* of it —
each a whole configuration with its own undo history — of which exactly one is
current. The conversations attached to the workspace are views onto the
installation, not onto a draft. Deliberately dumb persistence: it never touches
the solver or the product model, so callers pass in the initial configuration.
Last write wins; no locking (spec scope decision).
"""

import copy
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

_DEFAULT_DATA_DIR = Path(__file__).parent.parent / "data" / "workspaces"

# How many applied batches stay reversible, per draft (docs/specs/undo). Ten
# covers a long revision run and keeps the record readable by hand; anything a
# customer wants to hold past that is what a second draft is for.
HISTORY_DEPTH = 10

# What a workspace's first draft is called, and what the read-time adapter names
# the agreement of a workspace written before drafts existed.
FIRST_DRAFT_NAME = "Original"


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
    return _adapt(json.loads(path.read_text()))


def _new_draft(
    name: str,
    configuration: dict,
    forked_from: str | None = None,
    history: dict | None = None,
) -> dict:
    """A draft of the agreement. Unlike the workspace's own name it is never
    None: every tool addresses drafts by name, so a nameless draft would be one
    the agent could not switch to, compare or discard."""
    return {
        "id": uuid.uuid4().hex,
        "name": name.strip(),
        # The draft this one was copied from, None on the one a workspace opens
        # with. Recorded for display; never repaired when a parent is discarded,
        # so an unresolvable id reads as no lineage rather than a lineage that
        # never existed.
        "forkedFrom": forked_from,
        "configuration": configuration,
        "history": history or {"past": [], "future": []},
    }


def _adapt(record: dict) -> dict:
    """A workspace written before docs/specs/parallel-drafts holds one
    `configuration` and one `history` at the record. It opens as a single draft
    named "Original", carrying that history and no parent.

    A read-time adapter rather than a migration script: `agent/data/workspaces/`
    is local data, and the precedent for pre-feature records is to let them
    lapse rather than convert them. Frames are dropped — they cannot be
    converted honestly, since synthesizing the missing provenance would
    re-source every value to `user`, which is the defect drafts remove.
    """
    if "drafts" in record:
        return record
    configuration = record.pop("configuration", None) or {}
    configuration = {k: v for k, v in configuration.items() if k != "frames"}
    draft = _new_draft(FIRST_DRAFT_NAME, configuration, history=record.pop("history", None))
    record["drafts"] = [draft]
    record["currentDraftId"] = draft["id"]
    return record


def current_draft(record: dict) -> dict:
    """The draft every tool acts on and the canvas renders. Falls back to the
    first draft if the pointer is ever dangling — a workspace with drafts always
    has a current one, and no read path may be the one that raises."""
    drafts = record["drafts"]
    return next(
        (d for d in drafts if d["id"] == record.get("currentDraftId")), drafts[0]
    )


def find_draft(record: dict, name: str) -> dict | None:
    """Lookup by name, case-insensitively: the agent addresses drafts by the
    name it gave them, through a customer's sentence, and "premium" is the draft
    it called "Premium". Storage keeps the name as given."""
    wanted = name.strip().casefold()
    return next((d for d in record["drafts"] if d["name"].casefold() == wanted), None)


def draft_named(record: dict, name: str) -> dict:
    draft = find_draft(record, name)
    if draft is None:
        raise ValueError(
            f"no draft named {name.strip()!r}; this elevator has: "
            + ", ".join(repr(d["name"]) for d in record["drafts"])
        )
    return draft


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
    # .get: drafts adapted from workspaces persisted before docs/specs/undo
    # carry no history key
    return current_draft(record).get("history") or {"past": [], "future": []}


def history_head(record: dict, direction: str) -> dict | None:
    """The snapshot a restore in `direction` would return to, or None when that
    end of the current draft's history is empty. Pure read over a record the
    caller already holds — the tool needs the draft's own configuration anyway,
    to describe what the restore changes."""
    stack = _history(record)["past" if direction == "undo" else "future"]
    return stack[-1] if stack else None


def history_depths(record: dict) -> dict:
    """How many batches each way, within the current draft. Mirrored into agent
    state so the canvas can offer the controls without polling the store."""
    history = _history(record)
    return {"undo": len(history["past"]), "redo": len(history["future"])}


def create_workspace(configuration: dict) -> dict:
    # Workspaces are born unnamed; the agent names them from conversation
    # (rename_workspace) the way chat apps title conversations. Their first
    # draft is named from the start, because drafts are addressed by name.
    draft = _new_draft(FIRST_DRAFT_NAME, configuration)
    record = {
        "id": uuid.uuid4().hex,
        "name": None,
        "drafts": [draft],
        "currentDraftId": draft["id"],
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

    Content changes reach a draft's history through this one door and the
    structural moves below reach it not at all (docs/specs/parallel-drafts) —
    routing a switch through here would burn an undo slot and let a later undo
    walk backwards into a state belonging to another document.
    """
    record = get_workspace(workspace_id)
    draft = current_draft(record)
    history = _history(record)
    if configuration != draft["configuration"]:
        history = {
            "past": (history["past"] + [snapshot(draft["configuration"])])[-HISTORY_DEPTH:],
            "future": [],
        }
    draft["history"] = history
    draft["configuration"] = configuration
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
    solver by the caller; the store stays out of that. The history walked is
    the current draft's own.
    """
    record = get_workspace(workspace_id)
    draft = current_draft(record)
    history = _history(record)
    consumed, kept = ("past", "future") if direction == "undo" else ("future", "past")
    if not history[consumed]:
        raise ValueError(f"nothing to {direction}")
    draft["history"] = {
        consumed: history[consumed][:-1],
        kept: history[kept] + [snapshot(draft["configuration"])],
    }
    draft["configuration"] = configuration
    _stamp(record, thread_id)
    _write(record)
    return record


# -- drafts (docs/specs/parallel-drafts) ----------------------------------
#
# Structural moves: they rearrange drafts and move the pointer, and none of
# them touches a history. Forking, switching and discarding are not changes to
# a document, so they are not in any document's undo history.


def fork_draft(workspace_id: str, name: str, thread_id: str | None = None) -> dict:
    """Copy the current draft into a new one under `name`, and make it current.

    The copy is the whole configuration — choices with their sources, the
    candidate, the register state — so both drafts are live documents rather
    than one document and a snapshot of it. The fork starts with an empty
    history: no batch has been applied to it yet, and inheriting the source's
    would hand it a redo of a change that was never applied to this document.
    """
    name = name.strip()
    if not name:
        raise ValueError("a draft needs a non-empty name")
    record = get_workspace(workspace_id)
    if find_draft(record, name) is not None:
        raise ValueError(
            f"this elevator already has a draft named {name!r} — pick another name"
        )
    source = current_draft(record)
    draft = _new_draft(
        name, copy.deepcopy(source["configuration"]), forked_from=source["id"]
    )
    record["drafts"].append(draft)
    record["currentDraftId"] = draft["id"]
    _stamp(record, thread_id)
    _write(record)
    return record


def switch_draft(workspace_id: str, name: str, thread_id: str | None = None) -> dict:
    """Make another draft the current one. Nothing is written into any
    configuration, so no value is re-attributed by the move."""
    record = get_workspace(workspace_id)
    record["currentDraftId"] = draft_named(record, name)["id"]
    _stamp(record, thread_id)
    _write(record)
    return record


def discard_draft(workspace_id: str, name: str, thread_id: str | None = None) -> dict:
    """Remove a draft that is not the current one. The only draft of a
    workspace is always the current one, so the last draft is refused by the
    same check that refuses the one being worked on."""
    record = get_workspace(workspace_id)
    draft = draft_named(record, name)
    if draft["id"] == record["currentDraftId"]:
        raise ValueError(
            f"{draft['name']!r} is the draft being worked on"
            + (
                " and the only one this elevator has"
                if len(record["drafts"]) == 1
                else " — switch to another draft before discarding this one"
            )
        )
    record["drafts"] = [d for d in record["drafts"] if d["id"] != draft["id"]]
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
