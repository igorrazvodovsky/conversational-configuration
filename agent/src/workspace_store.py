"""Durable workspace store (docs/specs/agreement-workspace,
docs/specs/parallel-drafts).

One JSON file per workspace under agent/data/workspaces/. A workspace is the
durable home of one installation's agreement, held as several *drafts* of it —
each a whole configuration with its own log of the actions that made it — of
which exactly one is current. The conversations attached to the workspace are views onto the
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

from src import trace

_DEFAULT_DATA_DIR = Path(__file__).parent.parent / "data" / "workspaces"

# How far the cursor may walk back from the head of a draft's log, counted in
# reversible entries (docs/specs/undo, docs/specs/action-log). Ten covers a long
# revision run; anything a customer wants to hold past that is what a second
# draft is for.
HISTORY_DEPTH = 10

# How many entries a draft's log keeps, oldest dropped first. Reversibility and
# retention are two questions under a delta log, where a snapshot history made
# them one: an entry costs what its action changed rather than the size of the
# agreement, so the record can outlast what undo can reach
# (docs/specs/action-log).
LOG_RETENTION = 50

# What a workspace's first draft is called, and what the read-time adapter names
# the agreement of a workspace written before drafts existed.
FIRST_DRAFT_NAME = "Original"


def data_dir() -> Path:
    """Where workspaces live. The conversation checks point WORKSPACE_STORE_DIR
    at a temp directory so a test run cannot write into the developer's own
    agreements (docs/specs/conversation-checks design).

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


# Set by `_adapt` when it converted something, and popped by `_read`. A record
# carries no schema version, so "did this read change the record" is the only
# question the adapter can answer cheaply.
_CONVERTED = "_converted"


def _read(path: Path) -> dict:
    """A record, brought up to the shape every read path sees — and written
    back when the adapter had to convert it.

    Persisting here rather than leaving it to the next write is what makes a
    Clause an individual. The paper this vocabulary comes from asks an
    individual for a *persistent* identity, one that can be matched but not
    decomposed, and a uuid minted afresh on every read is neither: two reads of
    one document would disagree about which clauses they hold. The store
    computes a draft's log by diffing the configuration a tool hands back
    against the one it reads from disk, so disagreeing reads would log a
    phantom rewrite of the whole document on the next ordinary edit
    (docs/specs/document-clauses, decision 3).
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
        # Every action taken on this draft, oldest first (docs/specs/action-log).
        "log": [],
    }


def _adapt(record: dict) -> dict:
    """Bring a record written before a feature up to the shape every read path
    sees. A read-time adapter rather than a migration script:
    `agent/data/workspaces/` is local data, and the precedent for pre-feature
    records is to let them lapse rather than convert them.

    A workspace written before docs/specs/parallel-drafts holds one
    `configuration` at the record, and opens as a single draft named "Original"
    with no parent. Its frames are dropped — they cannot be converted honestly,
    since synthesizing the missing provenance would re-source every value to
    `user`, which is the defect drafts remove.

    A draft written before docs/specs/action-log holds a `history` of snapshots,
    and opens with an empty log. The snapshots lapse by the same argument the
    frames do: naming the action behind a stored state is provenance the record
    does not have.

    An `rfq` block written before docs/specs/document-clauses holds two lists,
    `requirements` and `unmapped`, and is lifted into one list of clauses. The
    configuration converts rather than lapsing, because nothing has to be
    invented: every entry of either list already carries its citation, its
    quote and what it says, and the only thing minted is the identity, which
    asserts nothing about the document.

    Its *log* is the other half, and there the precedent holds. An entry
    written before that spec states a clause's facts in a vocabulary with no
    clause identity in it — `requires` carrying the citation and the quote,
    `reconciled` addressed by variable — and the identity a converted entry
    would have to name is one that did not exist when the entry was written.
    So entries carrying those facts are dropped, exactly as the frames and the
    snapshots are, and every other entry in the same log survives: an ordinary
    revision moves `chose` and `attributed`, which this change did not touch.
    What lapses with them is undoing back past an ingestion or a
    reconciliation on a record written before this change.
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
    """Whether this entry states a clause's facts in the vocabulary that had no
    clause identity (docs/specs/document-clauses). `requires` and `note` are
    told by their arity, which the identity lengthened and shortened; a
    `reconciled` fact by whether it is addressed by an identity at all."""
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
    """`configuration` with a pre-docs/specs/document-clauses `rfq` block read
    as one list of clauses, as a new value.

    The read path above lifts a record in place, and a record is not the only
    door: a configuration also arrives from a thread checkpoint, which no
    adapter has ever seen. A conversation resumed on a thread written before
    that spec would otherwise hand the tools two lists, and every reader of the
    register indexes `clauses`.
    """
    rfq = configuration.get("rfq")
    if not rfq or "clauses" in rfq:
        return configuration
    block = copy.deepcopy(rfq)
    _lift_clauses({"rfq": block})
    return {**configuration, "rfq": block}


def _lift_clauses(configuration: dict) -> bool:
    """An `rfq` block's two lists read as one list of clauses, in place.

    Returns whether it lifted anything, so `_read` knows to persist the
    identities it minted — see the note there on why they cannot be minted
    twice.
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
        # Only when there is one to carry. `note` is a fact of a clause, and
        # the fact vocabulary states it or does not — writing an empty string
        # would put a key here that `trace.rebuild` drops, so a lifted record
        # and its own round trip would differ by it.
        if unmapped.get("note"):
            clause["note"] = unmapped["note"]
        clauses.append(clause)
    rfq["clauses"] = clauses
    return True


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


def draft_log(record: dict) -> list[dict]:
    """Every action taken on the current draft, oldest first. `.get`: a draft
    adapted from a workspace written before docs/specs/action-log carries no
    log key until something is written to it."""
    return current_draft(record).get("log") or []


def _entry(action: str, source: str, thread_id: str | None, change: dict) -> dict:
    """One occurrence, as the log holds it. `standing` is where the cursor is
    relative to this entry (docs/specs/action-log): `applied` while it is in
    force, `reversed` once undo has walked past it, `abandoned` once a later
    action has passed it, which is the redo tail discarded with the record
    kept."""
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
    """Land an entry at the head.

    An action that moves the agreement strands whatever the cursor had walked
    back past: those entries stop being reachable and stay readable, which is
    what the log has instead of a truncated redo tail. An action with no facts
    strands nothing, because it leaves the agreement where the reversed entries
    were replayable from — the other half of what the old no-op guard protected,
    and the reason a decline cannot cost the customer their redo.
    """
    log = list(draft.get("log") or [])
    if trace.is_reversible(entry):
        for older in log:
            if older["standing"] == "reversed":
                older["standing"] = "abandoned"
    log.append(entry)
    draft["log"] = log[-LOG_RETENTION:]


def _walked(log: list[dict]) -> int:
    """How far back from the head the cursor has already come, in reversible
    entries. Retention can drop entries from the far end without moving it,
    which is why the cursor is a standing on each entry rather than a
    position."""
    return sum(1 for e in log
               if e["standing"] == "reversed" and trace.is_reversible(e))


def _passed(log: list[dict], direction: str) -> list[dict]:
    """The entries one step in `direction` would move the cursor past, nearest
    first, ending on the entry it would invert. Empty when there is nothing to
    reverse within reach, and then nothing is marked at all.

    An action whose whole content is that it occurred — a declined change, or a
    batch that re-recorded what the agreement already held — is walked past
    rather than spent a step on, so a control is never offered for a reversal
    that would visibly do nothing.
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
    """Whether undo is refused because the cursor has walked its whole reach
    rather than because there is nothing left to reverse. Two refusals, and
    only one of them means the agreement is at its earliest recorded state."""
    log = draft_log(record)
    return (_walked(log) >= HISTORY_DEPTH
            and any(e["standing"] == "applied" and trace.is_reversible(e)
                    for e in log))


def reversal_target(record: dict, direction: str) -> dict | None:
    """The entry a reversal in `direction` would invert, or None when there is
    none within reach. Pure read over a record the caller already holds — the
    tool needs the draft's own configuration anyway, to rebuild the state the
    entry moved away from."""
    passed = _passed(draft_log(record), direction)
    return passed[-1] if passed else None


def history_depths(record: dict) -> dict:
    """How many reversals each way the current draft offers, counted in
    reversible entries and bounded by the reach. Mirrored into agent state so
    the canvas can offer the controls without polling the store, and computed
    the same way in `src/lib/workspaces.ts`, which seeds that mirror on
    attach."""
    log = draft_log(record)
    walked = _walked(log)
    applied = sum(1 for e in log
                  if e["standing"] == "applied" and trace.is_reversible(e))
    return {"undo": max(0, min(applied, HISTORY_DEPTH - walked)), "redo": walked}


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


def delete_workspace(workspace_id: str) -> None:
    """Destroy a workspace and everything it holds
    (docs/specs/agreement-workspace).

    The record is the container: its drafts, their logs and entries, the
    clauses of its document and the frozen document text are all inside the
    file, so unlinking it ends all of them at once and nothing has to be
    swept up afterwards. There is no archived state and no undelete — the log
    a reversal walks is itself inside the record — which is why this is the
    one store call with no `updatedAt` to stamp and no record to return.

    Deliberately through `_path`: the id arrives from a URL, and the guard
    there is what keeps a path-like one from unlinking a file that is not a
    workspace.

    What survives is the LangGraph checkpoints of the conversations that were
    attached. They are the ephemeral half of the system and the store has never
    owned them; after this they belong to nothing and are reachable from
    nowhere in the app (docs/specs/ontology-of-phenomena, finding 13).
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
    """Persist the agreement, log the action that moved it, and stamp the
    conversation it came from.

    `thread_id` is how the frontend knows which conversation to open a
    workspace on: the last one to change the agreement is where the operator
    left off (docs/specs/agreement-workspace). A thread the workspace has not
    registered yet is ignored — registration happens on the conversation's
    first message and stamps it then.

    This is also the door the log is written through (docs/specs/action-log):
    every mutating tool reaches the store here, so no tool can forget to record
    what it did, and the delta is computed from the two configurations rather
    than described by the caller, so no tool can record it wrongly either. What
    each tool has to supply is its own name and whose move it is.

    A batch that changed nothing lands an entry with no facts, and that entry
    is not reversible — one rule covering the no-op batch and the declined
    change, where the snapshot history needed a guard for the first and had
    nothing for the second.

    Content changes reach a draft's log through this one door and the
    structural moves below reach it not at all (docs/specs/parallel-drafts) —
    routing a switch through here would spend an undo step and let a later undo
    walk backwards into a state belonging to another document.
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
    """Record an action that asserted and retracted nothing, without touching
    the configuration (docs/specs/action-log).

    `keep_as_is` is the one caller: an occurrence whose whole content is that
    it occurred. It needs a door of its own rather than a flag on
    `save_configuration`, which would hand a tool that must never move the
    agreement a write path to it.

    The conversation is recorded on the entry and is deliberately not stamped.
    A workspace opens on the one that last *changed the agreement*
    (docs/specs/agreement-workspace), and this is the one action that changes
    nothing — stamping here would make a decline decide where the operator
    lands.
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
    """Move the cursor one step and write the state that comes back
    (docs/specs/action-log).

    Deliberately not `save_configuration`: a reversal appends nothing, so
    undoing and redoing the same batch ten times leaves ten cursor moves and
    one entry. Every entry the step passes changes standing, including the
    fact-less ones walked over on the way.

    `configuration` is the restored state, already re-validated through the
    solver by the caller; the store stays out of that. The log walked is the
    current draft's own.
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
# Structural moves: they rearrange drafts and move the pointer, and none of
# them touches a log. Forking, switching and discarding are not changes to a
# document, so they are in no document's record of what was done to it.


def fork_draft(workspace_id: str, name: str, thread_id: str | None = None) -> dict:
    """Copy the current draft into a new one under `name`, and make it current.

    The copy is the whole configuration — choices with their sources, the
    candidate, the register state — so both drafts are live documents rather
    than one document and a copy of it. The fork starts with an empty log: no
    action has been taken on it yet, and inheriting the source's would hand it
    a redo of a change that was never applied to this document.
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
    configuration, so no value is re-attributed by the move and no log
    grows."""
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
