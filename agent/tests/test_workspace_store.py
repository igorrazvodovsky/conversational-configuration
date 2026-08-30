"""Acceptance tests for docs/specs/agreement-workspace (store + write-through)
and docs/specs/parallel-drafts (drafts of one agreement)."""

import json

import pytest

from src import workspace_store
from src.configuration import apply_choices, empty_configuration


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKSPACE_STORE_DIR", str(tmp_path))
    return tmp_path


def _configuration(record: dict) -> dict:
    return workspace_store.current_draft(record)["configuration"]


def _save(workspace_id, config, thread_id=None, action="set_choices",
          source="user"):
    """A content action landing on the current draft. Every write names the
    action it was and whose move it is (docs/specs/action-log); the tests that
    are not about the log take the commonest pair."""
    return workspace_store.save_configuration(
        workspace_id, config, action, source, thread_id)


def test_create_and_get_round_trip():
    created = workspace_store.create_workspace(empty_configuration())
    got = workspace_store.get_workspace(created["id"])
    # born unnamed — the agent names it from conversation
    assert got["name"] is None
    assert got["threads"] == []
    # one draft, named from the start, and it is the current one
    assert [d["name"] for d in got["drafts"]] == [workspace_store.FIRST_DRAFT_NAME]
    assert workspace_store.current_draft(got)["id"] == got["currentDraftId"]
    # solver-derived statuses ride along, so a fresh workspace canvas is complete
    assert all(
        s == "open" for vals in _configuration(got)["statuses"].values()
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
    _save(ws["id"], config)
    got = workspace_store.get_workspace(ws["id"])
    assert _configuration(got)["choices"]["building_type"]["value"] == "hotel"
    assert got["updatedAt"] >= ws["updatedAt"]


def test_save_configuration_stamps_the_writing_thread():
    """A workspace opens on the conversation that last changed the agreement,
    so the write-through records which one that was."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "older")
    workspace_store.register_thread(ws["id"], "newer")
    _save(ws["id"], empty_configuration(), "older")
    threads = {t["id"]: t for t in workspace_store.get_workspace(ws["id"])["threads"]}
    assert threads["older"]["updatedAt"] > threads["newer"]["updatedAt"]


def test_save_configuration_without_a_thread_touches_none():
    """Canvas-only and legacy paths still persist; they just do not claim to be
    a conversation."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "thread-1")
    before = workspace_store.get_workspace(ws["id"])["threads"][0]["updatedAt"]
    _save(ws["id"], empty_configuration())
    after = workspace_store.get_workspace(ws["id"])["threads"][0]["updatedAt"]
    assert after == before


def test_save_configuration_ignores_an_unregistered_thread():
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], empty_configuration(), "not-yet")
    assert workspace_store.get_workspace(ws["id"])["threads"] == []


def test_register_thread_idempotent():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "thread-1")
    got = workspace_store.register_thread(ws["id"], "thread-1")
    assert [t["id"] for t in got["threads"]] == ["thread-1"]


def test_list_sorted_by_recency():
    a = workspace_store.create_workspace(empty_configuration())
    b = workspace_store.create_workspace(empty_configuration())
    _save(a["id"], empty_configuration())
    assert [w["id"] for w in workspace_store.list_workspaces()] == [a["id"], b["id"]]


def test_delete_destroys_the_record_and_leaves_the_others():
    """The record is the container (docs/specs/agreement-workspace): its
    drafts, their logs and its document are inside the file, so unlinking it
    ends all of them and touches nothing else."""
    doomed = workspace_store.create_workspace(empty_configuration())
    kept = workspace_store.create_workspace(empty_configuration())
    config, _ = apply_choices(empty_configuration(), {"rated_load": "kg1000"}, "user")
    _save(doomed["id"], config)

    workspace_store.delete_workspace(doomed["id"])

    assert not workspace_store._path(doomed["id"]).exists()
    assert [w["id"] for w in workspace_store.list_workspaces()] == [kept["id"]]
    with pytest.raises(KeyError):
        workspace_store.get_workspace(doomed["id"])


def test_deleting_what_is_not_there_raises():
    """Twice is the ordinary case — two tabs on one list — and it has to refuse
    rather than report a second success. The path-like id goes through the same
    guard every other call does, which is why the destructive one is written
    through `_path` too."""
    record = workspace_store.create_workspace(empty_configuration())
    workspace_store.delete_workspace(record["id"])
    with pytest.raises(KeyError):
        workspace_store.delete_workspace(record["id"])
    with pytest.raises(KeyError):
        workspace_store.delete_workspace("deadbeef")
    with pytest.raises(KeyError):
        workspace_store.delete_workspace("../escape")


def test_unknown_workspace_raises():
    with pytest.raises(KeyError):
        workspace_store.get_workspace("deadbeef")
    with pytest.raises(KeyError):
        _save("deadbeef", empty_configuration())
    with pytest.raises(KeyError):
        workspace_store.rename_workspace("deadbeef", "Tower")
    with pytest.raises(KeyError):
        workspace_store.get_workspace("../escape")


# -- the action log (docs/specs/action-log) -------------------------------


def _with(choices: dict) -> dict:
    config, _ = apply_choices(empty_configuration(), choices, "user")
    return config


def _log(workspace_id: str) -> list[dict]:
    return workspace_store.draft_log(workspace_store.get_workspace(workspace_id))


def _standings(workspace_id: str) -> list[str]:
    return [e["standing"] for e in _log(workspace_id)]


def test_every_write_lands_one_entry_under_its_own_name():
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}), action="set_choices")
    _save(ws["id"], _with({"building_type": "office"}),
          action="revise_choices", source="agent")

    log = _log(ws["id"])
    assert [(e["action"], e["source"]) for e in log] == [
        ("set_choices", "user"), ("revise_choices", "agent")]
    # newest last, and each entry says what it did rather than what the
    # agreement then was — the derived statuses are in no delta
    assert ["chose", "building_type", "office"] in log[1]["asserted"]
    assert ["chose", "building_type", "hotel"] in log[1]["retracted"]
    assert not any(f[0] == "status" for f in log[1]["asserted"])
    assert workspace_store.history_depths(
        workspace_store.get_workspace(ws["id"])) == {"undo": 2, "redo": 0}


def test_an_entry_carries_the_conversation_that_caused_it():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "conversation-a")
    _save(ws["id"], _with({"building_type": "hotel"}), "conversation-a")
    assert _log(ws["id"])[0]["conversation"] == "conversation-a"


def test_a_batch_that_changes_nothing_is_recorded_and_reverses_nothing():
    """The agent re-recording a value the agreement already holds is an action
    that occurred, so it lands. It asserted nothing, so it is no step back to
    anywhere and no undo is offered for it."""
    ws = workspace_store.create_workspace(empty_configuration())
    config = _with({"building_type": "hotel"})
    _save(ws["id"], config)
    record = _save(ws["id"], dict(config))
    assert len(_log(ws["id"])) == 2
    assert _log(ws["id"])[1]["asserted"] == []
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 0}


def test_an_action_with_no_facts_lands_without_touching_the_configuration():
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}))
    before = _configuration(workspace_store.get_workspace(ws["id"]))
    record = workspace_store.append_action(ws["id"], "keep_as_is", "user")

    assert _configuration(record) == before
    assert [e["action"] for e in _log(ws["id"])] == ["set_choices", "keep_as_is"]
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 0}


def test_a_decline_does_not_decide_which_conversation_the_workspace_opens_on():
    """A workspace opens on the conversation that last changed the agreement
    (docs/specs/agreement-workspace), and this is the one action that changes
    nothing. The entry still records where it came from."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "conversation-a")
    workspace_store.register_thread(ws["id"], "conversation-b")
    _save(ws["id"], _with({"building_type": "hotel"}), "conversation-a")
    record = workspace_store.append_action(
        ws["id"], "keep_as_is", "user", "conversation-b")

    threads = {t["id"]: t["updatedAt"] for t in record["threads"]}
    assert threads["conversation-a"] > threads["conversation-b"]
    assert _log(ws["id"])[-1]["conversation"] == "conversation-b"
    # the record itself did move — an entry landed on it
    assert record["updatedAt"] > threads["conversation-a"]


def test_the_cursor_walks_past_an_entry_with_no_facts():
    """A declined change sits between the customer and the batch they mean to
    reverse, and undo must not spend a step on it."""
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}))
    workspace_store.append_action(ws["id"], "keep_as_is", "user")

    record = workspace_store.get_workspace(ws["id"])
    target = workspace_store.reversal_target(record, "undo")
    assert target["action"] == "set_choices"
    workspace_store.commit_reversal(ws["id"], "undo", empty_configuration())
    # both entries are behind the cursor now, the declined one included
    assert _standings(ws["id"]) == ["reversed", "reversed"]
    assert workspace_store.history_depths(
        workspace_store.get_workspace(ws["id"])) == {"undo": 0, "redo": 1}


def test_a_log_of_nothing_but_declined_changes_offers_no_reversal():
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.append_action(ws["id"], "keep_as_is", "user")
    record = workspace_store.get_workspace(ws["id"])
    assert workspace_store.reversal_target(record, "undo") is None
    assert workspace_store.history_depths(record) == {"undo": 0, "redo": 0}
    # and nothing is marked by the refusal
    assert _standings(ws["id"]) == ["applied"]
    with pytest.raises(ValueError):
        workspace_store.commit_reversal(ws["id"], "undo", empty_configuration())


def test_the_cursor_moves_both_ways_and_the_entries_stay():
    ws = workspace_store.create_workspace(empty_configuration())
    first = _with({"building_type": "hotel"})
    second = _with({"building_type": "office"})
    _save(ws["id"], first)
    _save(ws["id"], second)

    record = workspace_store.commit_reversal(ws["id"], "undo", first)
    assert _configuration(record)["choices"]["building_type"]["value"] == "hotel"
    assert _standings(ws["id"]) == ["applied", "reversed"]
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 1}
    # undo is itself undoable, and the entry it walked past is still readable
    assert workspace_store.reversal_target(record, "redo")["action"] == "set_choices"

    record = workspace_store.commit_reversal(ws["id"], "redo", second)
    assert _configuration(record)["choices"]["building_type"]["value"] == "office"
    assert _standings(ws["id"]) == ["applied", "applied"]
    assert workspace_store.history_depths(record) == {"undo": 2, "redo": 0}


def test_a_new_action_abandons_the_redo_tail_and_keeps_the_record():
    """Today's redo tail is discarded; the entries that carried it stay in the
    log, unreachable, because what was tried and abandoned is half of what the
    record is for."""
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}))
    _save(ws["id"], _with({"building_type": "office"}))
    workspace_store.commit_reversal(ws["id"], "undo", _with({"building_type": "hotel"}))
    record = _save(ws["id"], _with({"building_type": "hospital"}))

    assert _standings(ws["id"]) == ["applied", "abandoned", "applied"]
    assert workspace_store.history_depths(record) == {"undo": 2, "redo": 0}
    assert workspace_store.reversal_target(record, "redo") is None


def test_an_action_with_no_facts_strands_no_redo_tail():
    """The other half of what the old no-op guard protected. An action that
    moved nothing leaves the agreement where the reversed entries were
    replayable from, so a decline — or the agent re-recording a value the
    agreement already holds — must not cost the customer their redo."""
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}))
    workspace_store.commit_reversal(ws["id"], "undo", empty_configuration())
    assert workspace_store.history_depths(
        workspace_store.get_workspace(ws["id"])) == {"undo": 0, "redo": 1}

    workspace_store.append_action(ws["id"], "keep_as_is", "user")
    record = _save(ws["id"], empty_configuration())  # a batch that changes nothing
    assert [e["standing"] for e in _log(ws["id"])] == [
        "reversed", "applied", "applied"]
    assert workspace_store.history_depths(record) == {"undo": 0, "redo": 1}
    assert workspace_store.reversal_target(record, "redo")["action"] == "set_choices"


def test_the_reach_is_a_different_refusal_from_the_end_of_the_log():
    """One of them means the agreement is at its earliest recorded state and
    the other does not, so the tool cannot answer them with one sentence."""
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    assert workspace_store.reversal_target(record, "undo") is None
    assert not workspace_store.beyond_reach(record)

    loads = ["kg630", "kg1000", "kg1250", "kg1600", "kg2000"] * 3
    for load in loads:
        _save(ws["id"], _with({"rated_load": load}))
    for load in list(reversed(loads[:-1]))[:workspace_store.HISTORY_DEPTH]:
        workspace_store.commit_reversal(ws["id"], "undo", _with({"rated_load": load}))

    record = workspace_store.get_workspace(ws["id"])
    assert workspace_store.reversal_target(record, "undo") is None
    assert workspace_store.beyond_reach(record)
    # and one step forward puts a reversal back within reach
    workspace_store.commit_reversal(ws["id"], "redo", _with({"rated_load": loads[0]}))
    assert not workspace_store.beyond_reach(workspace_store.get_workspace(ws["id"]))


def test_a_reversal_at_either_end_raises():
    ws = workspace_store.create_workspace(empty_configuration())
    with pytest.raises(ValueError):
        workspace_store.commit_reversal(ws["id"], "undo", empty_configuration())
    with pytest.raises(ValueError):
        workspace_store.commit_reversal(ws["id"], "redo", empty_configuration())


def test_the_cursor_may_not_walk_past_the_reach():
    ws = workspace_store.create_workspace(empty_configuration())
    loads = ["kg630", "kg1000", "kg1250", "kg1600", "kg2000"] * 3
    for load in loads:
        _save(ws["id"], _with({"rated_load": load}))
    for step, load in enumerate(reversed(loads[:-1])):
        if step == workspace_store.HISTORY_DEPTH:
            break
        workspace_store.commit_reversal(ws["id"], "undo", _with({"rated_load": load}))

    record = workspace_store.get_workspace(ws["id"])
    assert workspace_store.history_depths(record) == {
        "undo": 0, "redo": workspace_store.HISTORY_DEPTH}
    assert workspace_store.reversal_target(record, "undo") is None
    # and the entries the cursor cannot reach are still in the log
    assert len(_log(ws["id"])) == len(loads)


def test_retention_bounds_the_log_and_not_the_reach():
    """Two numbers, where the snapshot history had one: an entry costs what its
    action changed, so the record outlasts what undo can walk back to."""
    ws = workspace_store.create_workspace(empty_configuration())
    for n in range(workspace_store.LOG_RETENTION + 5):
        workspace_store.append_action(ws["id"], "keep_as_is", "user")
    assert len(_log(ws["id"])) == workspace_store.LOG_RETENTION

    _save(ws["id"], _with({"building_type": "hotel"}))
    record = workspace_store.get_workspace(ws["id"])
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 0}
    assert workspace_store.reversal_target(record, "undo")["action"] == "set_choices"


def test_the_log_crosses_conversations_and_survives_a_round_trip():
    """The last action taken is the last action taken whoever took it."""
    ws = workspace_store.create_workspace(empty_configuration())
    workspace_store.register_thread(ws["id"], "conversation-a")
    workspace_store.register_thread(ws["id"], "conversation-b")
    _save(ws["id"], _with({"building_type": "hotel"}), "conversation-a")
    _save(ws["id"], _with({"building_type": "office"}), "conversation-b")

    reread = workspace_store.get_workspace(ws["id"])
    assert workspace_store.history_depths(reread) == {"undo": 2, "redo": 0}
    assert [e["conversation"] for e in workspace_store.draft_log(reread)] == [
        "conversation-a", "conversation-b"]
    record = workspace_store.commit_reversal(
        ws["id"], "undo", _with({"building_type": "hotel"}), "conversation-a")
    # the reversal is a move by the conversation that made it, wherever the
    # action it reverses came from
    threads = {t["id"]: t for t in record["threads"]}
    assert threads["conversation-a"]["updatedAt"] > threads["conversation-b"]["updatedAt"]


def test_workspaces_written_before_the_log_open_with_an_empty_one():
    """Records on disk predate the feature, and their snapshots lapse: naming
    the action behind a stored state is provenance the record does not have."""
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    draft = workspace_store.current_draft(record)
    del draft["log"]
    draft["history"] = {"past": [{"choices": {}, "candidate": None}], "future": []}
    workspace_store._write(record)

    legacy = workspace_store.get_workspace(ws["id"])
    assert "history" not in workspace_store.current_draft(legacy)
    assert workspace_store.draft_log(legacy) == []
    assert workspace_store.history_depths(legacy) == {"undo": 0, "redo": 0}
    assert workspace_store.reversal_target(legacy, "undo") is None
    after = _save(ws["id"], _with({"building_type": "hotel"}))
    assert workspace_store.history_depths(after) == {"undo": 1, "redo": 0}


def test_a_document_written_as_two_lists_opens_as_one_list_of_clauses():
    """The lift of docs/specs/document-clauses. It converts rather than
    lapsing, because every fact is already in the old record and only the
    identity is minted."""
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    draft = workspace_store.current_draft(record)
    draft["configuration"]["rfq"] = {
        "requirements": [{"variable": "rated_speed", "value": "mps3_0",
                          "clause": "3.1", "quote": "3.0 m/s",
                          "reconciliation": "waived"}],
        "unmapped": [{"clause": "6.3", "quote": "possession", "note": "programme"}],
        "budget_cap": 1800,
    }
    workspace_store._write(record)

    rfq = workspace_store.current_draft(
        workspace_store.get_workspace(ws["id"]))["configuration"]["rfq"]
    assert "requirements" not in rfq and "unmapped" not in rfq
    assert rfq["budget_cap"] == 1800
    asked, unmapped = rfq["clauses"]
    assert asked["clause"] == "3.1" and asked["value"] == "mps3_0"
    assert asked["reconciliation"] == "waived"
    assert unmapped["note"] == "programme" and "variable" not in unmapped
    assert len({c["id"] for c in rfq["clauses"]}) == 2


def test_entries_written_before_clause_identity_lapse_and_the_rest_survive():
    """The other half of the lift. An entry written before
    docs/specs/document-clauses states a clause's facts with no identity in
    them, and the identity a converted entry would name did not exist when it
    was written — so those entries lapse the way frames and snapshots do,
    while an ordinary revision in the same log survives and stays reversible.
    """
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    draft = workspace_store.current_draft(record)
    draft["configuration"]["rfq"] = {
        "requirements": [{"variable": "rated_speed", "value": "mps3_0",
                          "clause": "3.1", "quote": "3.0 m/s",
                          "reconciliation": "waived"}],
        "unmapped": [{"clause": "6.3", "quote": "possession", "note": "programme"}],
    }
    draft["log"] = [
        {"id": "e1", "action": "ingest_rfq", "source": "document",
         "conversation": None, "at": "2026-08-01T00:00:00+00:00",
         "asserted": [["requires", "3.1", "3.0 m/s", "rated_speed", "mps3_0"],
                      ["note", "6.3", "possession", "programme"]],
         "retracted": [], "standing": "applied"},
        {"id": "e2", "action": "reconcile_requirement", "source": "user",
         "conversation": None, "at": "2026-08-01T00:01:00+00:00",
         "asserted": [["reconciled", "rated_speed", "waived"]],
         "retracted": [["reconciled", "rated_speed", "pending"]],
         "standing": "applied"},
        {"id": "e3", "action": "revise_choices", "source": "user",
         "conversation": None, "at": "2026-08-01T00:02:00+00:00",
         "asserted": [["chose", "building_type", "office"],
                      ["attributed", "building_type", "user"]],
         "retracted": [], "standing": "applied"},
    ]
    workspace_store._write(record)

    lifted = workspace_store.get_workspace(ws["id"])
    log = workspace_store.draft_log(lifted)
    assert [entry["id"] for entry in log] == ["e3"]
    # the ordinary revision is still there to be walked
    assert workspace_store.history_depths(lifted) == {"undo": 1, "redo": 0}
    target = workspace_store.reversal_target(lifted, "undo")
    assert target["action"] == "revise_choices"
    # and the document it was written beside came through the lift
    rfq = workspace_store.current_draft(lifted)["configuration"]["rfq"]
    assert [c["clause"] for c in rfq["clauses"]] == ["3.1", "6.3"]


def test_lifting_a_document_twice_leaves_it_alone():
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    draft = workspace_store.current_draft(record)
    draft["configuration"]["rfq"] = {
        "requirements": [{"variable": "rated_speed", "value": "mps3_0",
                          "clause": "3.1", "quote": "q",
                          "reconciliation": "pending"}],
        "unmapped": [],
    }
    workspace_store._write(record)
    once = workspace_store.get_workspace(ws["id"])
    workspace_store._write(once)
    twice = workspace_store.get_workspace(ws["id"])
    assert (workspace_store.current_draft(twice)["configuration"]["rfq"]
            == workspace_store.current_draft(once)["configuration"]["rfq"])


def _two_list_record() -> str:
    ws = workspace_store.create_workspace(empty_configuration())
    record = workspace_store.get_workspace(ws["id"])
    draft = workspace_store.current_draft(record)
    draft["configuration"]["rfq"] = {
        "requirements": [{"variable": "rated_speed", "value": "mps3_0",
                          "clause": "3.1", "quote": "3.0 m/s",
                          "reconciliation": "pending"}],
        "unmapped": [{"clause": "6.3", "quote": "possession", "note": "programme"}],
    }
    workspace_store._write(record)
    return ws["id"]


def test_a_lifted_clause_keeps_one_identity_across_reads():
    """A Clause is an individual, and an individual's identity is persistent.
    Minting a fresh uuid on every read made two reads of one document disagree
    about which clauses they hold (docs/specs/document-clauses, decision 3).
    No write between the reads: the write is what used to hide this."""
    workspace_id = _two_list_record()

    def ids():
        return [c["id"] for c in workspace_store.current_draft(
            workspace_store.get_workspace(workspace_id)
        )["configuration"]["rfq"]["clauses"]]

    assert ids() == ids()


def test_the_lift_is_persisted_by_the_read_that_made_it():
    """So the identities are minted exactly once, and nothing downstream has to
    know the record was ever written in the old shape."""
    workspace_id = _two_list_record()
    minted = [c["id"] for c in workspace_store.current_draft(
        workspace_store.get_workspace(workspace_id)
    )["configuration"]["rfq"]["clauses"]]

    on_disk = json.loads(workspace_store._path(workspace_id).read_text())
    rfq = on_disk["drafts"][0]["configuration"]["rfq"]
    assert "requirements" not in rfq and "unmapped" not in rfq
    assert [c["id"] for c in rfq["clauses"]] == minted
    # the adapter's own bookkeeping key never reaches the file
    assert "_converted" not in on_disk


def test_a_lifted_document_survives_its_own_fact_round_trip():
    """A lifted clause has to be sayable in the fact vocabulary and rebuildable
    from it, or a reversal beside a lifted document quietly loses part of it.
    An empty `note` is the case that failed: `facts` states a note or does not,
    so writing the key empty put something in the record that `rebuild` drops."""
    from src import trace

    workspace_id = _two_list_record()
    config = workspace_store.current_draft(
        workspace_store.get_workspace(workspace_id))["configuration"]
    rebuilt = trace.rebuild(trace.facts(config))
    assert rebuilt["rfq"]["clauses"] == config["rfq"]["clauses"]


def test_a_record_needing_no_conversion_is_not_rewritten():
    """The write-back is for a record the adapter changed. A read of an
    up-to-date record stays a read."""
    ws = workspace_store.create_workspace(empty_configuration())
    path = workspace_store._path(ws["id"])
    before = path.read_text()
    workspace_store.get_workspace(ws["id"])
    assert path.read_text() == before


def test_an_ordinary_edit_on_a_lifted_record_logs_only_itself():
    """The defect the persistence repairs: the attach read and the write-through
    read minted different identities, so the store diffed one document against
    another and logged a phantom rewrite of the whole thing on the next
    ordinary edit."""
    workspace_id = _two_list_record()
    config = workspace_store.current_draft(
        workspace_store.get_workspace(workspace_id))["configuration"]
    moved = {**config, "choices": {**config["choices"],
                                   "building_type": {"value": "hotel",
                                                     "source": "user"}}}
    workspace_store.save_configuration(
        workspace_id, moved, action="revise_choices", source="user")

    entry = workspace_store.draft_log(
        workspace_store.get_workspace(workspace_id))[-1]
    relations = {f[0] for f in entry["asserted"] + entry["retracted"]}
    assert relations == {"chose", "attributed"}


# -- drafts (docs/specs/parallel-drafts) ----------------------------------


def _forked(name: str = "Premium") -> tuple[str, dict]:
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}))
    return ws["id"], workspace_store.fork_draft(ws["id"], name)


def test_a_fork_carries_the_whole_configuration_and_becomes_current():
    workspace_id, record = _forked()
    assert [d["name"] for d in record["drafts"]] == ["Original", "Premium"]
    current = workspace_store.current_draft(record)
    assert current["name"] == "Premium"
    # the whole configuration, sources included — not an assignment and a price
    original = next(d for d in record["drafts"] if d["name"] == "Original")
    assert current["configuration"] == original["configuration"]
    assert current["configuration"]["choices"]["building_type"]["source"] == "user"
    assert current["forkedFrom"] == original["id"]


def test_editing_one_draft_leaves_the_other_alone():
    workspace_id, record = _forked()
    _save(workspace_id, _with({"building_type": "office"}))
    record = workspace_store.get_workspace(workspace_id)
    drafts = {d["name"]: d for d in record["drafts"]}
    assert drafts["Premium"]["configuration"]["choices"]["building_type"]["value"] == "office"
    assert drafts["Original"]["configuration"]["choices"]["building_type"]["value"] == "hotel"


def test_a_fork_starts_with_a_log_of_its_own_and_nothing_in_it():
    """No action has been taken on it yet, and inheriting the source's log
    would hand it a redo of a change never applied to this document."""
    workspace_id, record = _forked()
    assert workspace_store.draft_log(record) == []
    assert workspace_store.history_depths(record) == {"undo": 0, "redo": 0}
    assert workspace_store.reversal_target(record, "undo") is None


def test_a_structural_move_logs_nothing_and_abandons_no_redo_tail():
    workspace_id, _ = _forked()
    _save(workspace_id, _with({"building_type": "office"}))
    workspace_store.commit_reversal(workspace_id, "undo", _with({"building_type": "hotel"}))
    before = workspace_store.history_depths(workspace_store.get_workspace(workspace_id))
    assert before == {"undo": 0, "redo": 1}
    record = workspace_store.switch_draft(workspace_id, "Original")
    # the switch is not a change to either document — Original's own log
    # answers now, and Premium's redo tail is untouched
    assert workspace_store.history_depths(record) == {"undo": 1, "redo": 0}
    record = workspace_store.switch_draft(workspace_id, "Premium")
    assert workspace_store.history_depths(record) == before


def test_undo_walks_the_current_draft_s_own_log():
    workspace_id, _ = _forked()
    _save(workspace_id, _with({"building_type": "office"}))
    workspace_store.switch_draft(workspace_id, "Original")
    # Original's last action is the hotel one, not Premium's office one
    record = workspace_store.get_workspace(workspace_id)
    assert workspace_store.reversal_target(record, "undo")["asserted"] == [
        ["chose", "building_type", "hotel"],
        ["attributed", "building_type", "user"],
    ]
    workspace_store.commit_reversal(workspace_id, "undo", empty_configuration())
    record = workspace_store.get_workspace(workspace_id)
    assert _configuration(record)["choices"] == {}
    premium = next(d for d in record["drafts"] if d["name"] == "Premium")
    assert premium["configuration"]["choices"]["building_type"]["value"] == "office"


def test_switching_re_sources_nothing():
    workspace_id, _ = _forked()
    _save(workspace_id, _with({"region": "europe"}))
    record = workspace_store.switch_draft(workspace_id, "original")  # names are addresses
    assert workspace_store.current_draft(record)["name"] == "Original"
    assert _configuration(record)["choices"] == {
        "building_type": {"value": "hotel", "source": "user"}
    }


def test_a_draft_name_is_taken_once():
    workspace_id, _ = _forked()
    with pytest.raises(ValueError, match="already has a draft named"):
        workspace_store.fork_draft(workspace_id, "premium")
    with pytest.raises(ValueError):
        workspace_store.fork_draft(workspace_id, "   ")


def test_discarding_removes_only_that_draft():
    workspace_id, _ = _forked()
    record = workspace_store.discard_draft(workspace_id, "Original")
    assert [d["name"] for d in record["drafts"]] == ["Premium"]
    assert workspace_store.current_draft(record)["name"] == "Premium"


def test_the_draft_being_worked_on_cannot_be_discarded():
    workspace_id, _ = _forked()
    with pytest.raises(ValueError, match="being worked on"):
        workspace_store.discard_draft(workspace_id, "Premium")
    # and the only draft of a workspace is always that one
    ws = workspace_store.create_workspace(empty_configuration())
    with pytest.raises(ValueError, match="only one"):
        workspace_store.discard_draft(ws["id"], workspace_store.FIRST_DRAFT_NAME)


def test_an_unknown_draft_names_the_ones_there_are():
    workspace_id, _ = _forked()
    with pytest.raises(ValueError, match="'Original', 'Premium'"):
        workspace_store.draft_named(
            workspace_store.get_workspace(workspace_id), "Bargain")


def test_drafts_survive_a_round_trip_and_reach_every_conversation():
    workspace_id, _ = _forked()
    workspace_store.register_thread(workspace_id, "conversation-b")
    reread = workspace_store.get_workspace(workspace_id)
    assert [d["name"] for d in reread["drafts"]] == ["Original", "Premium"]
    assert workspace_store.current_draft(reread)["name"] == "Premium"


def test_a_workspace_written_before_drafts_opens_as_one():
    """The read-time adapter: the agreement becomes the only draft, and its
    frames and its snapshots are dropped rather than converted."""
    ws = workspace_store.create_workspace(empty_configuration())
    _save(ws["id"], _with({"building_type": "hotel"}))
    record = workspace_store.get_workspace(ws["id"])
    draft = workspace_store.current_draft(record)
    legacy = {
        "id": record["id"],
        "name": None,
        "configuration": {**draft["configuration"], "frames": [{"name": "practical"}]},
        "history": {"past": [{"choices": {}, "candidate": None}], "future": []},
        "threads": [],
        "createdAt": record["createdAt"],
        "updatedAt": record["updatedAt"],
    }
    workspace_store._write(legacy)

    adapted = workspace_store.get_workspace(ws["id"])
    assert [d["name"] for d in adapted["drafts"]] == [workspace_store.FIRST_DRAFT_NAME]
    assert workspace_store.current_draft(adapted)["forkedFrom"] is None
    assert "frames" not in _configuration(adapted)
    assert _configuration(adapted)["choices"]["building_type"]["value"] == "hotel"
    assert workspace_store.history_depths(adapted) == {"undo": 0, "redo": 0}
    # and it is a workspace like any other from there on
    record = workspace_store.fork_draft(ws["id"], "Premium")
    assert workspace_store.current_draft(record)["name"] == "Premium"


def test_attach_rfq_freezes_the_document_text():
    record = workspace_store.create_workspace({"choices": {}})
    workspace_store.attach_rfq(record["id"], "RFQ 2026/HV-114 ...")
    stored = workspace_store.get_workspace(record["id"])
    assert stored["rfq_document"]["text"] == "RFQ 2026/HV-114 ..."
    assert stored["rfq_document"]["ingestedAt"]


def test_attach_rfq_survives_configuration_writes():
    """The document is reference material, not working state: nothing the
    conversation does to the agreement touches it."""
    record = workspace_store.create_workspace(empty_configuration())
    workspace_store.attach_rfq(record["id"], "the document")
    _save(record["id"], _with({"region": "europe"}))
    assert workspace_store.get_workspace(record["id"])["rfq_document"]["text"] == "the document"


def test_attach_rfq_unknown_workspace():
    with pytest.raises(KeyError):
        workspace_store.attach_rfq("deadbeef", "text")
