"""Durable workspace store (docs/specs/agreement-workspace/design.md,
docs/specs/parallel-drafts/design.md).

One JSON file per workspace under agent/data/workspaces/, holding several
drafts of the agreement with exactly one current. The conversations attached to
a workspace are views onto the installation, not onto a draft.

Deliberately dumb persistence: it never touches the solver or the product
model, so callers pass in the initial configuration. Last write wins, and there
is no locking.
"""

import copy
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from src import trace

_DEFAULT_DATA_DIR = Path(__file__).parent.parent / "data" / "workspaces"

# How far the cursor may walk back from the head of a draft's log, in reversible
# entries. Anything a customer wants to hold past that is what a draft is for.
HISTORY_DEPTH = 10

# How many entries a draft's log keeps, oldest dropped first. Reach and
# retention are two questions under a delta log, where a snapshot history made
# them one.
LOG_RETENTION = 50

# What a workspace's first draft is called, and the name the adapter gives the
# agreement of a workspace written before drafts existed.
FIRST_DRAFT_NAME = "Original"


def data_dir() -> Path:
    """Resolved per call, not at import: pytest imports every test module before
    deselecting any, so this module is loaded by the time a scenario sets
    WORKSPACE_STORE_DIR.
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


# Set by `_adapt` when it converted something, popped by `_read`. A record
# carries no schema version.
_CONVERTED = "_converted"


def _read(path: Path) -> dict:
    """A record, brought up to the shape every read path sees, and written back when
    the adapter converted it. Persisting here rather than at the next write is what
    mints a clause's identity exactly once
    (docs/specs/document-clauses/design.md decisions 2 and 3).
    """
    record = _adapt(json.loads(path.read_text()))
    if record.pop(_CONVERTED, False):
        _write(record)
    return record


def _new_draft(
    name: str,
    configuration: dict,
    forked_from: str | None = None,
) -> dict:
    return {
        "id": uuid.uuid4().hex,
        "name": name.strip(),
# None on the draft a workspace opens with. Never repaired when a parent is
# discarded, so an unresolvable id reads as no lineage.
        "forkedFrom": forked_from,
        "configuration": configuration,
        # Every action taken on this draft, oldest first (docs/specs/action-log).
        "log": [],
    }


def _adapt(record: dict) -> dict:
    """Bring a record written before a feature up to the shape every read path sees. A
    read-time adapter rather than a migration script, because
    `agent/data/workspaces/` is local data.

    The rule between the three conversions is whether the new shape can be reached
    without inventing anything (docs/specs/document-clauses/design.md decision 3).
    """
    converted = False
    if "drafts" not in record:
        configuration = record.pop("configuration", None) or {}
        configuration = {k: v for k, v in configuration.items() if k != "frames"}
        draft = _new_draft(FIRST_DRAFT_NAME, configuration)
        record.pop("history", None)
        record["drafts"] = [draft]
        record["currentDraftId"] = draft["id"]
        converted = True
    for draft in record["drafts"]:
        converted |= draft.pop("history", None) is not None
        converted |= "log" not in draft
        draft.setdefault("log", [])
        converted |= _lift_clauses(draft.get("configuration") or {})
        kept = [entry for entry in draft["log"]
                if not _predates_clause_identity(entry)]
        converted |= len(kept) != len(draft["log"])
        draft["log"] = kept
    if converted:
        record[_CONVERTED] = True
    return record


def _predates_clause_identity(entry: dict) -> bool:
    """`requires` and `note` are told by their arity, which the identity lengthened
    and shortened; a `reconciled` fact by whether it is addressed by an identity at
    all.
    """
    for fact in entry.get("asserted", []) + entry.get("retracted", []):
        relation = fact[0]
        if relation == "requires" and len(fact) != 4:
            return True
        if relation == "note" and len(fact) != 3:
            return True
        if relation == "reconciled" and not _is_identity(fact[1]):
            return True
    return False


def _is_identity(value) -> bool:
    try:
        uuid.UUID(str(value))
    except ValueError:
        return False
    return True


def lifted(configuration: dict) -> dict:
    """A configuration also arrives from a thread checkpoint, which no adapter has
    ever seen, and every reader of the register indexes `clauses`.
    """
    rfq = configuration.get("rfq")
    if not rfq or "clauses" in rfq:
        return configuration
    block = copy.deepcopy(rfq)
    _lift_clauses({"rfq": block})
    return {**configuration, "rfq": block}


def _lift_clauses(configuration: dict) -> bool:
    """Returns whether it lifted anything, so `_read` knows to persist the identities
    it minted.
    """
    rfq = configuration.get("rfq")
    if not rfq or "clauses" in rfq:
        return False
    clauses = []
    for requirement in rfq.pop("requirements", []):
        clauses.append({
            "id": str(uuid.uuid4()),
            "clause": requirement.get("clause", ""),
            "quote": requirement.get("quote", ""),
            "variable": requirement["variable"],
            "value": requirement["value"],
            "reconciliation": requirement.get("reconciliation", "pending"),
        })
    for unmapped in rfq.pop("unmapped", []):
        clause = {
            "id": str(uuid.uuid4()),
            "clause": unmapped.get("clause", ""),
            "quote": unmapped.get("quote", ""),
        }
        # Only when there is one to carry: the fact vocabulary states a `note` or
        # does not, so an empty one would put a key here that `trace.rebuild`
        # drops.
        if unmapped.get("note"):
            clause["note"] = unmapped["note"]
        clauses.append(clause)
    rfq["clauses"] = clauses
    return True


def current_draft(record: dict) -> dict:
    """Falls back to the first draft if the pointer is ever dangling: no read path may
    be the one that raises.
    """
    drafts = record["drafts"]
    return next(
        (d for d in drafts if d["id"] == record.get("currentDraftId")), drafts[0]
    )


def find_draft(record: dict, name: str) -> dict | None:
    """Case-insensitively: the agent addresses drafts by the name it gave them,
    through a customer's sentence. Storage keeps the name as given.
    """
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
    now = _now()
    record["updatedAt"] = now
    for thread in record["threads"]:
        if thread["id"] == thread_id:
            thread["updatedAt"] = now


def _write(record: dict) -> None:
    data_dir().mkdir(parents=True, exist_ok=True)
    _path(record["id"]).write_text(json.dumps(record, indent=2))


def draft_log(record: dict) -> list[dict]:
    """`.get`: a draft adapted from a pre-log workspace carries no log key."""
    return current_draft(record).get("log") or []


def _entry(action: str, source: str, thread_id: str | None, change: dict) -> dict:
    """`standing` is where the cursor is relative to this entry: `applied` while it is
    in force, `reversed` once undo has walked past it, `abandoned` once a later
    action has passed it.
    """
    return {
        "id": uuid.uuid4().hex,
        "action": action,
        "source": source,
        "conversation": thread_id,
        "at": _now(),
        "standing": "applied",
        "asserted": list(change["asserted"]),
        "retracted": list(change["retracted"]),
    }


def _append(draft: dict, entry: dict) -> None:
    """A reversible action strands whatever the cursor had walked back past, which is
    what the log has instead of a truncated redo tail. An action with no facts
    strands nothing, so a decline cannot cost the customer their redo.
    """
    log = list(draft.get("log") or [])
    if trace.is_reversible(entry):
        for older in log:
            if older["standing"] == "reversed":
                older["standing"] = "abandoned"
    log.append(entry)
    draft["log"] = log[-LOG_RETENTION:]


def _walked(log: list[dict]) -> int:
    """Retention can drop entries from the far end without moving the cursor, which is
    why it is a standing on each entry rather than a position.
    """
    return sum(1 for e in log
               if e["standing"] == "reversed" and trace.is_reversible(e))


def _passed(log: list[dict], direction: str) -> list[dict]:
    """Nearest first, ending on the entry the step would invert. Empty when there is
    nothing to reverse within reach, and then nothing is marked at all. An entry
    with no facts is walked past rather than spent a step on.
    """
    if direction == "undo":
        if _walked(log) >= HISTORY_DEPTH:
            return []
        candidates = [e for e in reversed(log) if e["standing"] == "applied"]
    elif direction == "redo":
        candidates = [e for e in log if e["standing"] == "reversed"]
    else:
        raise ValueError(f"no such direction as {direction!r}")
    passed = []
    for entry in candidates:
        passed.append(entry)
        if trace.is_reversible(entry):
            return passed
    return []


def beyond_reach(record: dict) -> bool:
    """Two refusals, and only one of them means the agreement is at its earliest
    recorded state.
    """
    log = draft_log(record)
    return (_walked(log) >= HISTORY_DEPTH
            and any(e["standing"] == "applied" and trace.is_reversible(e)
                    for e in log))


def reversal_target(record: dict, direction: str) -> dict | None:
    passed = _passed(draft_log(record), direction)
    return passed[-1] if passed else None


def history_depths(record: dict) -> dict:
    """Counted in reversible entries and bounded by the reach. Computed the same way in
    `src/lib/workspaces.ts`, which seeds the mirror on attach.
    """
    log = draft_log(record)
    walked = _walked(log)
    applied = sum(1 for e in log
                  if e["standing"] == "applied" and trace.is_reversible(e))
    return {"undo": max(0, min(applied, HISTORY_DEPTH - walked)), "redo": walked}


def create_workspace(configuration: dict) -> dict:
    # Workspaces are born unnamed and the agent names them from conversation. A
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


def delete_workspace(workspace_id: str) -> None:
    """The record is the container, so unlinking it ends drafts, logs, entries and the
    frozen document text at once — which is why this is the one store call with no
    `updatedAt` to stamp and no record to return.

    Through `_path` deliberately: the id arrives from a URL, and the guard there
    keeps a path-like one from unlinking a file that is not a workspace.
    """
    path = _path(workspace_id)
    if not path.exists():
        raise KeyError(f"no workspace {workspace_id!r}")
    path.unlink()


def list_workspaces() -> list[dict]:
    if not data_dir().exists():
        return []
    records = [_read(p) for p in data_dir().glob("*.json")]
    return sorted(records, key=lambda r: r["updatedAt"], reverse=True)


def save_configuration(
    workspace_id: str,
    configuration: dict,
    action: str,
    source: str,
    thread_id: str | None = None,
) -> dict:
    """The one door the log is written through, so no tool can forget to record what
    it did; the delta is computed from the two configurations rather than described
    by the caller, so none can record it wrongly. A batch that changed nothing
    lands an entry with no facts, which is not reversible.

    A thread the workspace has not registered yet is ignored. The structural draft
    moves reach this door not at all
    (docs/specs/parallel-drafts/design.md).
    """
    record = get_workspace(workspace_id)
    draft = current_draft(record)
    change = trace.delta(draft["configuration"], configuration)
    _append(draft, _entry(action, source, thread_id, change))
    draft["configuration"] = configuration
    _stamp(record, thread_id)
    _write(record)
    return record


def append_action(
    workspace_id: str, action: str, source: str, thread_id: str | None = None
) -> dict:
    """`keep_as_is` is the one caller. A door of its own rather than a flag on
    `save_configuration`, which would hand a tool that must never move the
    agreement a write path to it. The conversation is recorded on the entry and
    deliberately not stamped.
    """
    record = get_workspace(workspace_id)
    _append(current_draft(record), _entry(action, source, thread_id, trace.EMPTY))
    _stamp(record)
    _write(record)
    return record


def commit_reversal(
    workspace_id: str,
    direction: str,
    configuration: dict,
    thread_id: str | None = None,
) -> dict:
    """Not `save_configuration`: a reversal appends nothing, so undoing and redoing
    the same batch ten times leaves ten cursor moves and one entry.
    """
    record = get_workspace(workspace_id)
    draft = current_draft(record)
    passed = _passed(draft.get("log") or [], direction)
    if not passed:
        raise ValueError(f"nothing to {direction}")
    standing = "reversed" if direction == "undo" else "applied"
    for entry in passed:
        entry["standing"] = standing
    draft["configuration"] = configuration
    _stamp(record, thread_id)
    _write(record)
    return record


# -- drafts (docs/specs/parallel-drafts) ----------------------------------
#
# Structural moves: they rearrange drafts and move the pointer, and none of them
# touches a log.


def fork_draft(workspace_id: str, name: str, thread_id: str | None = None) -> dict:
    """The fork starts with an empty log: inheriting the source's would hand it a redo
    of a change never applied to this document.
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
    """Nothing is written into any configuration, so no value is re-attributed and no
    log grows.
    """
    record = get_workspace(workspace_id)
    record["currentDraftId"] = draft_named(record, name)["id"]
    _stamp(record, thread_id)
    _write(record)
    return record


def discard_draft(workspace_id: str, name: str, thread_id: str | None = None) -> dict:
    """The only draft of a workspace is always the current one, so the last draft is
    refused by the same check that refuses the one being worked on.
    """
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
    """The raw text is reference material, not working state: it never enters the
    shared configuration.
    """
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
    # createdAt orders the conversation list; updatedAt is the last time this
    # conversation moved the agreement, and decides which one a workspace opens
    # on.
        record["threads"].append({"id": thread_id, "createdAt": now, "updatedAt": now})
        record["updatedAt"] = now
        _write(record)
    return record
