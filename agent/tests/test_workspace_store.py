"""Acceptance tests for docs/specs/agreement-workspace (store + write-through)."""

import pytest

from src import workspace_store
from src.configuration import apply_choices, empty_configuration


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKSPACE_STORE_DIR", str(tmp_path))
    return tmp_path


def test_create_and_get_round_trip():
    created = workspace_store.create_workspace(empty_configuration())
    got = workspace_store.get_workspace(created["id"])
    # born unnamed — the agent names it from conversation
    assert got["name"] is None
    assert got["threads"] == []
    # solver-derived statuses ride along, so a fresh workspace canvas is complete
    assert all(
        s == "open" for vals in got["configuration"]["statuses"].values()
        for s in vals.values()
    )


def test_rename_persists_and_touches():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.rename_workspace(ws["id"], "  Riverside Tower — north lift ")
    got = workspace_store.get_workspace(ws["id"])
    assert got["name"] == "Riverside Tower — north lift"
    assert got["updatedAt"] >= ws["updatedAt"]


def test_rename_rejects_empty_name():
    ws = workspace_store.create_workspace(empty_configuration())
    with pytest.raises(ValueError):
        workspace_store.rename_workspace(ws["id"], "   ")


def test_save_configuration_persists_and_touches():
    ws = workspace_store.create_workspace(empty_configuration())
    config, _ = apply_choices(empty_configuration(), {"building_type": "hotel"}, "user")
    workspace_store.save_configuration(ws["id"], config)
    got = workspace_store.get_workspace(ws["id"])
    assert got["configuration"]["choices"]["building_type"]["value"] == "hotel"
    assert got["updatedAt"] >= ws["updatedAt"]


def test_register_thread_idempotent():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "thread-1")
    got = workspace_store.register_thread(ws["id"], "thread-1")
    assert [t["id"] for t in got["threads"]] == ["thread-1"]


def test_list_sorted_by_recency():
    a = workspace_store.create_workspace(empty_configuration())
    b = workspace_store.create_workspace(empty_configuration())
    workspace_store.save_configuration(a["id"], empty_configuration())
    assert [w["id"] for w in workspace_store.list_workspaces()] == [a["id"], b["id"]]


def test_unknown_workspace_raises():
    with pytest.raises(KeyError):
        workspace_store.get_workspace("deadbeef")
    with pytest.raises(KeyError):
        workspace_store.save_configuration("deadbeef", empty_configuration())
    with pytest.raises(KeyError):
        workspace_store.rename_workspace("deadbeef", "Tower")
    with pytest.raises(KeyError):
        workspace_store.get_workspace("../escape")
