"""Durable workspace store (docs/specs/agreement-workspace).

One JSON file per workspace under agent/data/workspaces/. A workspace is the
durable home of one installation's agreement — its configuration (choices,
candidate, frames) plus the conversations attached to it. Deliberately dumb
persistence: it never touches the solver or the product model, so callers pass
in the initial configuration. Last write wins; no locking (spec scope
decision).
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "workspaces"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _path(workspace_id: str) -> Path:
    # ids are uuid4 hex we minted ourselves; reject anything path-like anyway
    if not workspace_id.isalnum():
        raise KeyError(f"no workspace {workspace_id!r}")
    return DATA_DIR / f"{workspace_id}.json"


def _read(path: Path) -> dict:
    return json.loads(path.read_text())


def _write(record: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _path(record["id"]).write_text(json.dumps(record, indent=2))


def create_workspace(configuration: dict) -> dict:
    # Workspaces are born unnamed; the agent names them from conversation
    # (rename_workspace) the way chat apps title conversations.
    record = {
        "id": uuid.uuid4().hex,
        "name": None,
        "configuration": configuration,
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
    if not DATA_DIR.exists():
        return []
    records = [_read(p) for p in DATA_DIR.glob("*.json")]
    return sorted(records, key=lambda r: r["updatedAt"], reverse=True)


def save_configuration(workspace_id: str, configuration: dict) -> dict:
    record = get_workspace(workspace_id)
    record["configuration"] = configuration
    record["updatedAt"] = _now()
    _write(record)
    return record


def register_thread(workspace_id: str, thread_id: str) -> dict:
    """Attach a conversation to the workspace (idempotent)."""
    record = get_workspace(workspace_id)
    if not any(t["id"] == thread_id for t in record["threads"]):
        record["threads"].append({"id": thread_id, "createdAt": _now()})
        record["updatedAt"] = _now()
        _write(record)
    return record
