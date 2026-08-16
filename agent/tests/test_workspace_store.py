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


def test_save_configuration_stamps_the_writing_thread():
    """A workspace opens on the conversation that last changed the agreement,
    so the write-through records which one that was."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "older")
    workspace_store.register_thread(ws["id"], "newer")
    workspace_store.save_configuration(ws["id"], empty_configuration(), "older")
    threads = {t["id"]: t for t in workspace_store.get_workspace(ws["id"])["threads"]}
    assert threads["older"]["updatedAt"] > threads["newer"]["updatedAt"]


def test_save_configuration_without_a_thread_touches_none():
    """Canvas-only and legacy paths still persist; they just do not claim to be
    a conversation."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "thread-1")
    before = workspace_store.get_workspace(ws["id"])["threads"][0]["updatedAt"]
    workspace_store.save_configuration(ws["id"], empty_configuration())
    after = workspace_store.get_workspace(ws["id"])["threads"][0]["updatedAt"]
    assert after == before


def test_save_configuration_ignores_an_unregistered_thread():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.save_configuration(ws["id"], empty_configuration(), "not-yet")
    assert workspace_store.get_workspace(ws["id"])["threads"] == []


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


# -- undo history (docs/specs/undo) ---------------------------------------


def _with(choices: dict) -> dict:
    config, _ = apply_choices(empty_configuration(), choices, "user")
    return config


def test_history_records_the_state_each_batch_replaced():
    ws = workspace_store.create_workspace(empty_configuration())
    first = _with({"building_type": "hotel"})
    workspace_store.save_configuration(ws["id"], first)
    second = _with({"building_type": "office"})
    record = workspace_store.save_configuration(ws["id"], second)

    assert workspace_store.history_depths(record) == {"undo": 2, "redo": 0}
    # newest last, and the derived statuses are not kept — a restore re-derives
    # them, so there is nothing to copy blind
    head = workspace_store.history_head(record, "undo")
    assert head["choices"]["building_type"]["value"] == "hotel"
    assert "statuses" not in head


def test_a_batch_that_changes_nothing_keeps_no_history():
    """Otherwise the agent re-recording a value it already recorded would burn
    a slot, and the customer's undo would visibly do nothing."""
    ws = workspace_store.create_workspace(empty_configuration())
    config = _with({"building_type": "hotel"})
    workspace_store.save_configuration(ws["id"], config)
    record = workspace_store.save_configuration(ws["id"], dict(config))
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 0}


def test_restore_moves_between_the_stacks_both_ways():
    ws = workspace_store.create_workspace(empty_configuration())
    first = _with({"building_type": "hotel"})
    workspace_store.save_configuration(ws["id"], first)
    second = _with({"building_type": "office"})
    workspace_store.save_configuration(ws["id"], second)

    record = workspace_store.commit_restore(ws["id"], "undo", first)
    assert record["configuration"]["choices"]["building_type"]["value"] == "hotel"
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 1}
    # undo is itself undoable: what it walked away from is on the redo stack
    assert (workspace_store.history_head(record, "redo")["choices"]
            ["building_type"]["value"] == "office")

    record = workspace_store.commit_restore(ws["id"], "redo", second)
    assert record["configuration"]["choices"]["building_type"]["value"] == "office"
    assert workspace_store.history_depths(record) == {"undo": 2, "redo": 0}


def test_a_new_batch_discards_the_redo_tail():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.save_configuration(ws["id"], _with({"building_type": "hotel"}))
    workspace_store.save_configuration(ws["id"], _with({"building_type": "office"}))
    workspace_store.commit_restore(ws["id"], "undo", _with({"building_type": "hotel"}))
    record = workspace_store.save_configuration(
        ws["id"], _with({"building_type": "hospital"}))
    assert workspace_store.history_depths(record) == {"undo": 2, "redo": 0}


def test_restore_at_the_end_of_the_history_raises():
    ws = workspace_store.create_workspace(empty_configuration())
    with pytest.raises(ValueError):
        workspace_store.commit_restore(ws["id"], "undo", empty_configuration())
    with pytest.raises(ValueError):
        workspace_store.commit_restore(ws["id"], "redo", empty_configuration())


def test_history_is_bounded():
    ws = workspace_store.create_workspace(empty_configuration())
    for load in ["kg630", "kg1000", "kg1250", "kg1600", "kg2000"] * 3:
        workspace_store.save_configuration(ws["id"], _with({"rated_load": load}))
    record = workspace_store.get_workspace(ws["id"])
    assert workspace_store.history_depths(record)["undo"] == workspace_store.HISTORY_DEPTH


def test_history_crosses_conversations_and_survives_a_round_trip():
    """The last applied batch is the last applied batch whoever applied it."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "conversation-a")
    workspace_store.register_thread(ws["id"], "conversation-b")
    workspace_store.save_configuration(
        ws["id"], _with({"building_type": "hotel"}), "conversation-a")
    workspace_store.save_configuration(
        ws["id"], _with({"building_type": "office"}), "conversation-b")

    reread = workspace_store.get_workspace(ws["id"])
    assert workspace_store.history_depths(reread) == {"undo": 2, "redo": 0}
    record = workspace_store.commit_restore(
        ws["id"], "undo", _with({"building_type": "hotel"}), "conversation-a")
    # the undo is a move by the conversation that made it, wherever the batch
    # it reversed came from
    threads = {t["id"]: t for t in record["threads"]}
    assert threads["conversation-a"]["updatedAt"] > threads["conversation-b"]["updatedAt"]


def test_workspaces_written_before_undo_have_no_history():
    """Records on disk predate the feature; every read path defaults it."""
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    del record["history"]
    workspace_store._write(record)

    legacy = workspace_store.get_workspace(ws["id"])
    assert workspace_store.history_depths(legacy) == {"undo": 0, "redo": 0}
    assert workspace_store.history_head(legacy, "undo") is None
    after = workspace_store.save_configuration(ws["id"], _with({"building_type": "hotel"}))
    assert workspace_store.history_depths(after) == {"undo": 1, "redo": 0}


def test_attach_rfq_freezes_the_document_text():
    record = workspace_store.create_workspace({"choices": {}})
    workspace_store.attach_rfq(record["id"], "RFQ 2026/HV-114 ...")
    stored = workspace_store.get_workspace(record["id"])
    assert stored["rfq_document"]["text"] == "RFQ 2026/HV-114 ..."
    assert stored["rfq_document"]["ingestedAt"]


def test_attach_rfq_survives_configuration_writes():
    """The document is reference material, not working state: nothing the
    conversation does to the agreement touches it."""
    record = workspace_store.create_workspace({"choices": {}})
    workspace_store.attach_rfq(record["id"], "the document")
    workspace_store.save_configuration(record["id"], {"choices": {"region": "europe"}})
    assert workspace_store.get_workspace(record["id"])["rfq_document"]["text"] == "the document"


def test_attach_rfq_unknown_workspace():
    with pytest.raises(KeyError):
        workspace_store.attach_rfq("deadbeef", "text")
