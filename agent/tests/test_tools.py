"""Acceptance tests for the agent tool layer (docs/specs/agent-tools).

The pure state transitions these tools call are covered by
`test_configuration.py` and the durable store by `test_workspace_store.py`.
What is checked here is the seam between them — the write-through to the
workspace, the state mirrors the canvas renders its chrome from
(docs/specs/parallel-drafts, docs/specs/undo), and the branches a conversation
can take when there is no workspace, the store refuses, or the solver does.

A tool's body is called directly with a hand-built `ToolRuntime`, and `advance`
does to the state what the graph would do with the returned `Command`. The
tools' wording is not asserted beyond the facts it must carry: the conversation
checks own conversational behavior, and constitution #9 keeps prose out of
both.
"""

import json

import pytest
from langchain.tools import ToolRuntime

from src import configuration as configuration_module
from src import workspace_store
from src.configuration import (
    apply_choices,
    ask_choices,
    clear_choices,
    compare_drafts,
    discard_draft_tool,
    empty_configuration,
    fork_draft_tool,
    get_configuration,
    ingest_rfq,
    keep_as_is,
    make_candidate,
    name_workspace,
    propose_completion,
    reconcile_requirement,
    redo_change,
    revise_choices,
    set_choices,
    switch_draft_tool,
    undo_change,
)
from tests.rfq_fixtures import OFFICE_TOWER, OFFICE_TOWER_BUDGET_CAP, OFFICE_TOWER_PATH


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKSPACE_STORE_DIR", str(tmp_path))
    return tmp_path


# -- driving a tool -------------------------------------------------------


def _runtime(state: dict, tool_call_id: str = "call-1") -> ToolRuntime:
    return ToolRuntime(
        state=state, context=None, config={}, stream_writer=None,
        tool_call_id=tool_call_id, store=None,
    )


def call(tool, state: dict, **kwargs):
    """One tool call against `state`, returning whatever the tool returns."""
    return tool.func(runtime=_runtime(state), **kwargs)


def advance(state: dict, result):
    """What the graph does with a tool's `Command`: everything but the message
    lands on the state the next call reads."""
    state.update({k: v for k, v in result.update.items() if k != "messages"})
    return result


def step(tool, state: dict, **kwargs):
    """A tool call whose state update is carried forward, as in a real run."""
    return advance(state, call(tool, state, **kwargs))


def text(command) -> str:
    return command.update["messages"][0].content


# -- state under test -----------------------------------------------------


def attached(configuration: dict | None = None) -> dict:
    """A workspace holding `configuration`, and the agent state attached to it."""
    config = configuration or empty_configuration()
    record = workspace_store.create_workspace(config)
    return {"workspace_id": record["id"], "configuration": config}


def detached(configuration: dict | None = None) -> dict:
    """A conversation with no workspace behind it — the legacy thread."""
    return {"configuration": configuration or empty_configuration()}


def stored(state: dict) -> dict:
    """The current draft's configuration as the store holds it."""
    record = workspace_store.get_workspace(state["workspace_id"])
    return workspace_store.current_draft(record)["configuration"]


def priced(**choices) -> dict:
    config, _ = apply_choices(empty_configuration(), choices, "user")
    return make_candidate(config)


# -- write-through (docs/specs/agreement-workspace) -----------------------


def test_a_recorded_choice_reaches_the_durable_workspace():
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    assert stored(state)["choices"]["building_type"]["value"] == "hospital"
    assert stored(state)["choices"]["building_type"]["source"] == "user"


def test_the_write_through_precedes_the_reply(monkeypatch):
    """A message the agent has read always describes a durable agreement, so
    the store must already hold the change by the time the reply is built."""
    state = attached()
    seen = {}
    original = configuration_module._reply

    def spy(runtime, content, **update):
        seen["choices"] = stored(state)["choices"]
        return original(runtime, content, **update)

    monkeypatch.setattr(configuration_module, "_reply", spy)
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    assert "building_type" in seen["choices"]


def test_the_write_through_stamps_the_conversation_that_moved_it(monkeypatch):
    """Which conversation last moved the agreement is where the operator left
    off, so the tool has to pass the running thread to the store."""
    state = attached()
    workspace_store.register_thread(state["workspace_id"], "thread-1")
    workspace_store.register_thread(state["workspace_id"], "thread-2")
    monkeypatch.setattr(configuration_module, "_current_thread_id", lambda: "thread-1")
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    threads = {t["id"]: t["updatedAt"]
               for t in workspace_store.get_workspace(state["workspace_id"])["threads"]}
    record = workspace_store.get_workspace(state["workspace_id"])
    assert threads["thread-1"] == record["updatedAt"]
    assert threads["thread-2"] != record["updatedAt"]


def test_a_conversation_with_no_workspace_still_moves_its_own_state():
    state = detached()
    command = step(set_choices, state,
                   choices={"building_type": "hospital"}, source="user")
    assert state["configuration"]["choices"]["building_type"]["value"] == "hospital"
    # nothing durable to mirror, so no chrome in the update
    assert "history" not in command.update and "drafts" not in command.update


def test_a_workspace_that_is_gone_does_not_break_the_conversation():
    state = {"workspace_id": "does-not-exist", "configuration": empty_configuration()}
    command = step(set_choices, state,
                   choices={"building_type": "hospital"}, source="user")
    assert state["configuration"]["choices"]["building_type"]["value"] == "hospital"
    assert "Recorded" in text(command)
    assert "history" not in command.update


def test_declining_a_change_moves_nothing_and_is_still_recorded():
    """keep_as_is answers a change that never was: no configuration in the
    update, and nothing added to what undo can reach
    (docs/specs/nonlinear-interaction). What it does leave is an entry saying
    the change was declined (docs/specs/action-log)."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    before = stored(state)
    command = call(keep_as_is, state)
    assert "configuration" not in command.update
    assert stored(state) == before

    record = workspace_store.get_workspace(state["workspace_id"])
    entry = workspace_store.draft_log(record)[-1]
    assert (entry["action"], entry["asserted"], entry["retracted"]) == (
        "keep_as_is", [], [])
    assert workspace_store.history_depths(record)["undo"] == 1


def test_declining_a_change_without_a_workspace_records_nothing():
    command = call(keep_as_is, detached())
    assert set(command.update) == {"messages"}


# -- the log (docs/specs/action-log) --------------------------------------


def _last_entry(state: dict) -> dict:
    return workspace_store.draft_log(
        workspace_store.get_workspace(state["workspace_id"]))[-1]


def test_every_content_tool_commits_under_its_own_name():
    """The runtime carries no tool name, so each tool passes its own. A name
    that drifts from the tool spending it fails here, and a tool that commits
    without one raises before it can log anonymously."""
    state = attached()
    for tool, kwargs in [
        (set_choices, {"choices": {"building_type": "hotel"}, "source": "user"}),
        (revise_choices, {"changes": {"building_type": "office"}, "source": "user"}),
        (propose_completion, {}),
        (clear_choices, {"variables": ["building_type"]}),
        (keep_as_is, {}),
    ]:
        step(tool, state, **kwargs)
        assert _last_entry(state)["action"] == tool.name, tool.name

    document = seeded()
    assert _last_entry(document)["action"] == "ingest_rfq"
    step(reconcile_requirement, document, variable="rated_speed", move="open")
    assert _last_entry(document)["action"] == "reconcile_requirement"


def test_the_names_an_entry_may_carry_are_tools_that_commit():
    """CONTENT_ACTIONS is what the offline coupling check reads, so it has to
    stay the set of tools that reach a store door."""
    assert configuration_module.CONTENT_ACTIONS <= {
        t.name for t in configuration_module.configuration_tools}
    with pytest.raises(ValueError, match="not an action the log knows"):
        configuration_module._logged("switch_draft")


def test_an_entry_records_whose_move_it_was():
    """Not always who the facts are attributed to: the two content tools pass
    their own argument, so the agent recording what the customer just said logs
    a customer's move."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hotel"}, source="user")
    step(propose_completion, state)
    log = workspace_store.draft_log(
        workspace_store.get_workspace(state["workspace_id"]))
    assert [e["source"] for e in log] == ["user", "agent"]


# -- the mirrors the canvas renders from (docs/specs/parallel-drafts) -----

MIRRORS = {"history", "current_draft_id", "drafts"}


def test_a_change_mirrors_the_history_depth():
    state = attached()
    command = step(set_choices, state,
                   choices={"building_type": "hospital"}, source="user")
    assert MIRRORS <= set(command.update)
    assert command.update["history"] == {"undo": 1, "redo": 0}


def test_every_structural_move_mirrors_the_drafts():
    state = attached()
    for command in (
        step(fork_draft_tool, state, name="Premium"),
        step(switch_draft_tool, state, name="Original"),
        step(discard_draft_tool, state, name="Premium"),
    ):
        assert MIRRORS <= set(command.update), text(command)


def test_declining_a_change_costs_the_customer_no_redo():
    """It writes an entry, so it has to mirror the counts — and it must not
    change them. A decline leaves the agreement where the undone change was
    replayable from, so the redo survives it and redo still puts it back."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    step(undo_change, state)
    assert state["history"] == {"undo": 0, "redo": 1}

    command = step(keep_as_is, state)
    assert MIRRORS <= set(command.update)
    assert command.update["history"] == {"undo": 0, "redo": 1}
    step(redo_change, state)
    assert stored(state)["choices"]["building_type"]["value"] == "hospital"


def test_a_restore_mirrors_the_drafts_too():
    """A switch or an undo that left the depths behind would offer the canvas
    an undo belonging to another document."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    command = step(undo_change, state)
    assert MIRRORS <= set(command.update)
    assert command.update["history"] == {"undo": 0, "redo": 1}


def test_the_draft_mirror_carries_each_draft_s_price():
    state = attached(priced(building_type="hotel"))
    command = step(fork_draft_tool, state, name="Premium")
    prices = {d["name"]: d["price"] for d in command.update["drafts"]}
    assert set(prices) == {"Original", "Premium"}
    assert all(p == state["configuration"]["candidate"]["price"] for p in prices.values())


def test_the_current_draft_mirror_follows_the_switch():
    state = attached()
    step(fork_draft_tool, state, name="Premium")
    command = step(switch_draft_tool, state, name="Original")
    names = {d["id"]: d["name"] for d in command.update["drafts"]}
    assert names[command.update["current_draft_id"]] == "Original"


# -- what a tool does with a refusal --------------------------------------


def test_an_unknown_variable_comes_back_as_an_error_not_an_exception():
    state = attached()
    command = call(set_choices, state, choices={"colour": "red"}, source="user")
    assert text(command).startswith("ERROR:")
    assert "configuration" not in command.update
    assert stored(state)["choices"] == {}


def test_a_batch_records_what_fits_and_names_what_it_declines():
    """One collision inside a batch must not cost the choices that had nothing
    to do with it, and neither half of the collision is picked for the
    customer."""
    state = attached()
    command = step(
        set_choices, state,
        choices={"building_type": "hospital", "installation": "modernization",
                 "rated_speed": "mps3_0"},
        source="user",
    )
    assert "NOT recorded" in text(command) and "R" in text(command)
    recorded = set(stored(state)["choices"])
    assert "building_type" in recorded
    assert not recorded & {"installation", "rated_speed"}


def test_a_collision_comes_back_as_repair_options():
    state = attached()
    step(set_choices, state,
         choices={"installation": "modernization", "rated_speed": "mps1_6"},
         source="user")
    command = call(revise_choices, state,
                   changes={"rated_speed": "mps3_0"}, source="user")
    payload = json.loads(text(command))
    assert payload["kind"] == "repairs"
    assert [d["variable"] for d in payload["repairs"][0]["drop"]] == ["installation"]
    # nothing moved: the customer picks a repair first
    assert "configuration" not in command.update
    assert stored(state)["choices"]["rated_speed"]["value"] == "mps1_6"


def test_changes_that_contradict_each_other_come_back_as_the_conflict():
    """No repair to the *other* choices can help, so the conflict itself is
    what the agent gets."""
    state = attached()
    command = call(
        revise_choices, state,
        changes={"installation": "modernization", "rated_speed": "mps3_0"},
        source="user",
    )
    assert text(command).startswith("REJECTED")
    assert "configuration" not in command.update


def _after(message: str, state: dict) -> dict:
    """The state a tool sees on a turn the customer opened with `message`."""
    return {**state, "messages": [{"role": "user", "content": message}]}


def test_set_choices_refuses_a_message_the_customer_dispatched():
    """The routing is a fact about the message, not a request to the model: the
    prompt asking for revise_choices was measurably not enough on the opening
    turn of a conversation (docs/specs/one-gesture-one-action)."""
    state = attached()
    command = call(
        set_choices,
        _after("Set Building type to Hospital (building_type=hospital)", state),
        choices={"building_type": "hospital"}, source="user",
    )
    assert text(command).startswith("REFUSED")
    assert "revise_choices" in text(command)
    assert "configuration" not in command.update
    assert stored(state)["choices"] == {}


def test_set_choices_refuses_a_sheet_edit_too():
    state = attached()
    command = call(
        set_choices,
        _after("Canvas edit: Set Building type to Hospital (building_type=hospital)",
               state),
        choices={"building_type": "hospital"}, source="user",
    )
    assert text(command).startswith("REFUSED")
    assert stored(state)["choices"] == {}


def test_set_choices_still_records_what_the_customer_said_in_prose():
    """The guard reaches the dispatched sentences and nothing else. A customer
    describing their building is what set_choices is for."""
    state = attached()
    step(set_choices, _after("It's a hospital in Frankfurt.", state),
         choices={"building_type": "hospital"}, source="user")
    assert stored(state)["choices"]["building_type"]["value"] == "hospital"


def test_prose_that_opens_on_the_grammars_own_word_is_not_a_gesture():
    """"Set up an elevator for a hospital" is a customer talking. Matching the
    first word would send a batch the agent translated out of prose to a total
    action, and lose the partial application that protects the rest of what
    they said (docs/specs/agent-tools design, what a rejection costs)."""
    state = attached()
    step(set_choices,
         _after("Set up an elevator for a hospital, 12 floors, busy mornings.",
                state),
         choices={"building_type": "hospital"}, source="user")
    assert stored(state)["choices"]["building_type"]["value"] == "hospital"


def test_a_conflicting_pick_on_an_undecided_term_still_offers_repairs():
    """Every dispatched `Set …` sentence reaches this tool, so a pick on a term
    nobody had decided gets repair paths rather than the refusal `set_choices`
    would give it (docs/specs/one-gesture-one-action)."""
    state = attached()
    step(set_choices, state, choices={"installation": "modernization"},
         source="user")
    command = call(revise_choices, state,
                   changes={"rated_speed": "mps3_0"}, source="user")
    payload = json.loads(text(command))
    assert payload["kind"] == "repairs"
    assert [d["variable"] for d in payload["repairs"][0]["drop"]] == ["installation"]
    assert "configuration" not in command.update


def test_a_half_conflicting_batch_lands_nothing_and_offers_repairs():
    """What a multi-variable control dispatches is one total action: the
    customer picked every value in it deliberately, so the innocent half
    landing is worse than being shown the way through. This is the reverse of
    what `set_choices` does with a prose batch (docs/specs/agent-tools design,
    what a rejection costs)."""
    state = attached()
    step(set_choices, state, choices={"installation": "modernization"},
         source="user")
    command = call(
        revise_choices, state,
        changes={"rated_speed": "mps3_0", "building_type": "hotel"},
        source="user",
    )
    payload = json.loads(text(command))
    assert payload["kind"] == "repairs"
    assert [d["variable"] for d in payload["repairs"][0]["drop"]] == ["installation"]
    assert "configuration" not in command.update
    # the innocent half of the batch is not recorded either
    assert "building_type" not in stored(state)["choices"]


def test_a_batch_of_undecided_terms_applies_whole():
    """The ordinary case of a dispatched batch: nothing was decided before, and
    the tool that used to be for revisions records it without ceremony."""
    state = attached()
    step(revise_choices, state,
         changes={"building_type": "office", "region": "europe",
                  "installation": "new_build"},
         source="user")
    choices = stored(state)["choices"]
    assert {v: c["value"] for v, c in choices.items()
            if v in ("building_type", "region", "installation")} == {
        "building_type": "office", "region": "europe",
        "installation": "new_build"}
    assert choices["building_type"]["source"] == "user"


def test_applying_a_repair_drops_and_sets_in_one_step():
    state = attached()
    step(set_choices, state,
         choices={"installation": "modernization", "rated_speed": "mps1_6"},
         source="user")
    step(revise_choices, state, changes={"rated_speed": "mps3_0"},
         source="user", drop=["installation"])
    choices = stored(state)["choices"]
    assert choices["rated_speed"]["value"] == "mps3_0"
    assert "installation" not in choices


def test_withdrawing_an_unknown_variable_is_an_error():
    state = attached()
    command = call(clear_choices, state, variables=["colour"])
    assert text(command).startswith("ERROR:")
    assert "configuration" not in command.update


# -- drafts (docs/specs/parallel-drafts) ----------------------------------


def test_forking_names_the_draft_it_came_from():
    state = attached()
    command = step(fork_draft_tool, state, name="Premium")
    assert "'Premium'" in text(command) and "'Original'" in text(command)


def test_switching_carries_the_other_draft_s_configuration_into_state():
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    step(fork_draft_tool, state, name="Premium")
    step(revise_choices, state, changes={"building_type": "hotel"}, source="user")
    step(switch_draft_tool, state, name="Original")
    assert state["configuration"]["choices"]["building_type"]["value"] == "hospital"


def test_discarding_the_draft_being_worked_on_is_refused():
    state = attached()
    command = call(discard_draft_tool, state, name="Original")
    assert text(command).startswith("ERROR:")


def test_a_draft_name_that_is_not_there_names_the_ones_that_are():
    state = attached()
    command = call(switch_draft_tool, state, name="Premium")
    assert text(command).startswith("ERROR:")
    assert "Original" in text(command)


def test_the_draft_tools_say_so_when_there_is_no_workspace():
    state = detached()
    for tool, kwargs in (
        (fork_draft_tool, {"name": "Premium"}),
        (switch_draft_tool, {"name": "Premium"}),
        (discard_draft_tool, {"name": "Premium"}),
    ):
        command = call(tool, state, **kwargs)
        assert "no drafts" in text(command)
        assert set(command.update) == {"messages"}


def test_comparing_takes_the_current_side_from_the_run_s_own_state():
    """The column labelled current is the sheet the customer is looking at, so
    it comes from the run's state and not from the store."""
    state = attached(priced(building_type="hotel"))
    step(fork_draft_tool, state, name="Premium")
    state["configuration"] = priced(building_type="hotel", cop="touch_premium")
    payload = json.loads(call(compare_drafts, state, a="Original"))
    assert payload["b"]["name"] == "Premium" and payload["b"]["isCurrent"] is True
    assert payload["b"]["price"] == state["configuration"]["candidate"]["price"]
    assert "cop" in [d["variable"] for d in payload["differences"]]


def test_comparing_a_draft_with_itself_is_refused():
    state = attached(priced(building_type="hotel"))
    assert call(compare_drafts, state, a="Original", b="Original").startswith("ERROR:")


def test_comparing_without_a_workspace_is_an_error():
    assert call(compare_drafts, detached(), a="Original").startswith("ERROR:")


# -- undo and redo (docs/specs/undo) --------------------------------------


def test_undo_reverses_the_last_batch_and_redo_puts_it_back():
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    step(undo_change, state)
    assert stored(state)["choices"] == {}
    assert state["configuration"]["choices"] == {}
    step(redo_change, state)
    assert stored(state)["choices"]["building_type"]["value"] == "hospital"


def test_undo_names_the_move_it_reversed_and_whose_it_was():
    """The record holds the action, so the reply can name the move rather than
    describe the difference it made (ontology finding 3)."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="agent")
    command = step(undo_change, state)
    assert "the assistant's recording of Building type" in text(command)
    # and what moved is still said, because the customer is about to see it
    assert "Hospital" in text(command)


def test_undo_walks_past_a_declined_change_to_the_batch_before_it():
    """A decline sits between the customer and the batch they mean to reverse,
    and it is no step back to anywhere."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    step(keep_as_is, state)
    command = step(undo_change, state)
    assert "your recording of Building type" in text(command)
    assert stored(state)["choices"] == {}


def test_each_end_of_the_history_says_which_end_it_is():
    state = attached()
    assert "Nothing to undo" in text(call(undo_change, state))
    assert "Nothing to redo" in text(call(redo_change, state))


def test_a_walk_that_has_used_its_whole_reach_does_not_claim_to_be_the_start():
    """Two refusals, not one: earlier states are still in the record, and
    saying the agreement is at its earliest recorded state would be false."""
    state = attached()
    loads = ["kg630", "kg1000", "kg1250", "kg1600", "kg2000"] * 3
    for load in loads:
        step(revise_choices, state, changes={"rated_load": load}, source="user")
    for _ in range(workspace_store.HISTORY_DEPTH):
        step(undo_change, state)

    command = call(undo_change, state)
    assert "as far as undo reaches" in text(command)
    assert "earliest recorded state" not in text(command)


def test_undo_walks_the_current_draft_s_own_log():
    """A fork starts with no log of its own, so an undo taken on it must not
    reach into the log of the draft it came from."""
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    step(fork_draft_tool, state, name="Premium")
    assert "Nothing to undo" in text(call(undo_change, state))
    step(revise_choices, state, changes={"building_type": "hotel"}, source="user")
    step(undo_change, state)
    assert stored(state)["choices"]["building_type"]["value"] == "hospital"


def test_undo_without_a_workspace_has_no_history_to_walk():
    command = call(undo_change, detached())
    assert "no history" in text(command)
    assert set(command.update) == {"messages"}


def test_undo_when_the_workspace_is_gone_is_an_error():
    state = {"workspace_id": "does-not-exist", "configuration": empty_configuration()}
    assert text(call(undo_change, state)).startswith("ERROR:")


# -- the RFQ tools (docs/specs/rfq-reconciliation) ------------------------


def seeded() -> dict:
    state = attached()
    step(ingest_rfq, state, clauses=OFFICE_TOWER,
         document_text=OFFICE_TOWER_PATH.read_text(),
         budget_cap=OFFICE_TOWER_BUDGET_CAP)
    return state


def test_ingest_seeds_the_agreement_and_names_its_deviations():
    state = seeded()
    command = call(get_configuration, state)
    assert stored(state)["candidate"] is not None
    assert all(c["source"] == "document" for c in stored(state)["choices"].values())
    assert "Open deviations from the document" in command


def test_ingest_reports_the_rules_behind_each_deviation():
    state = attached()
    command = step(ingest_rfq, state, clauses=OFFICE_TOWER,
                   document_text=OFFICE_TOWER_PATH.read_text(),
                   budget_cap=OFFICE_TOWER_BUDGET_CAP)
    assert "Because R" in text(command)


def test_ingest_freezes_the_document_text_on_the_workspace():
    state = seeded()
    record = workspace_store.get_workspace(state["workspace_id"])
    assert "RFQ MOD-2026-07" in record["rfq_document"]["text"]


def test_ingest_reports_the_cap_the_document_states():
    state = attached()
    command = step(ingest_rfq, state, clauses=OFFICE_TOWER,
                   document_text=OFFICE_TOWER_PATH.read_text(),
                   budget_cap=OFFICE_TOWER_BUDGET_CAP)
    assert f"caps the charge at {OFFICE_TOWER_BUDGET_CAP} EUR/month" in text(command)


def test_ingest_lists_the_clauses_no_variable_carries():
    state = attached()
    command = step(
        ingest_rfq, state,
        clauses=OFFICE_TOWER + [
            {"clause": "6.3", "quote": "Possession of the shaft is available "
                                       "from 4 May 2026", "note": "possession"}],
        document_text=OFFICE_TOWER_PATH.read_text(),
    )
    assert "no product variable carries" in text(command) and "6.3" in text(command)


def test_a_thread_written_before_clause_identity_still_reads_its_document():
    """State arrives from a thread checkpoint, which the store's read-time
    adapter never sees, so the tool door lifts it too
    (docs/specs/document-clauses)."""
    state = attached()
    state["configuration"] = {
        **empty_configuration(),
        "choices": {"rated_speed": {"value": "mps2_5", "source": "document"}},
        "rfq": {
            "requirements": [{"variable": "rated_speed", "value": "mps3_0",
                              "clause": "3.1", "quote": "3.0 m/s",
                              "reconciliation": "pending"}],
            "unmapped": [],
        },
    }
    command = call(get_configuration, state)
    assert "clause 3.1" in command or "3.1" in command
    assert not command.startswith("ERROR:")


def test_ingest_reports_the_clauses_the_document_leaves_to_us():
    """The third kind of clause reaches the agent as something to raise
    (docs/specs/document-clauses, finding 9)."""
    state = attached()
    command = step(
        ingest_rfq, state,
        clauses=OFFICE_TOWER + [
            {"variable": "door_finish", "clause": "6.5",
             "quote": "Door finish open to proposal"}],
        document_text=OFFICE_TOWER_PATH.read_text(),
    )
    assert "leaves these to us" in text(command) and "clause 6.5" in text(command)
    left = configuration_module.clauses_left_to_us(stored(state))
    assert [c["clause"] for c in left] == ["6.5"]


def test_ingesting_twice_is_an_error_and_moves_nothing():
    state = seeded()
    before = stored(state)
    command = call(ingest_rfq, state, clauses=OFFICE_TOWER,
                   document_text="")
    assert text(command).startswith("ERROR:")
    assert stored(state) == before


def test_accepting_a_deviation_waives_it_and_reports_the_register():
    state = seeded()
    deviation = next(
        e["variable"] for e in configuration_module.register(state["configuration"])
        if e["status"] == "deviation"
    )
    command = step(reconcile_requirement, state, variable=deviation, move="accept")
    assert "Waived clause" in text(command)
    assert "Waived (still listed, never forgotten)" in text(command)
    marks = {r["variable"]: r["reconciliation"]
             for r in configuration_module.requirements(stored(state))}
    assert marks[deviation] == "waived"


def test_a_thread_resumed_before_clause_identity_takes_the_record_s_clauses():
    """The second door into a configuration. A pre-document-clauses checkpoint
    holds two lists, and minting identity for them here would hand the store a
    document it does not recognise — so the block is taken from the record,
    which minted them once already (docs/specs/document-clauses, decision 3)."""
    state = attached()
    step(ingest_rfq, state,
         clauses=[{"variable": "rated_speed", "value": "mps3_0",
                   "clause": "3.1", "quote": "3.0 m/s"}],
         document_text="tender")
    minted = [c["id"] for c in stored(state)["rfq"]["clauses"]]

    # what the checkpoint of a conversation written before that spec carries
    old = {**state["configuration"], "rfq": {
        "requirements": [{"variable": "rated_speed", "value": "mps3_0",
                          "clause": "3.1", "quote": "3.0 m/s",
                          "reconciliation": "pending"}],
        "unmapped": [],
    }}
    resumed = {"workspace_id": state["workspace_id"], "configuration": old}
    step(revise_choices, resumed, changes={"building_type": "hotel"},
         source="user")

    assert [c["id"] for c in stored(resumed)["rfq"]["clauses"]] == minted
    entry = workspace_store.draft_log(
        workspace_store.get_workspace(state["workspace_id"]))[-1]
    relations = {f[0] for f in entry["asserted"] + entry["retracted"]}
    # the edit moved a choice and dropped the candidate; the document is
    # untouched, where a second minting would have rewritten every clause of it
    assert not relations & {"cites", "quote", "carries", "requires",
                            "note", "reconciled"}


def test_undoing_a_move_that_only_marked_a_clause_names_its_term():
    """`reconciled(Clause, Mark)` names a clause, so a reopen — the one move
    whose whole content is a mark — has no term in its facts. The reversal
    resolves the clause to say what moved (docs/specs/document-clauses)."""
    state = seeded()
    deviation = next(
        e["variable"] for e in configuration_module.register(state["configuration"])
        if e["status"] == "deviation")
    step(reconcile_requirement, state, variable=deviation, move="accept")
    step(reconcile_requirement, state, variable=deviation, move="open")

    label = configuration_module.MODEL.variables[deviation].label
    said = text(step(undo_change, state))
    assert f"deviation on {label}" in said
    assert "nothing the sheet shows" not in said


def test_undoing_an_ingestion_names_it_once():
    """The action's phrase and the possessive before it are one sentence, and
    this action's source is always the document."""
    state = seeded()
    said = text(step(undo_change, state))
    # the source possessive and the phrase are one sentence, so "the document"
    # may appear once in the naming of the move and not twice
    named = said.split(".")[0]
    assert "the document's seeding" in named
    assert named.count("the document") == 1


def test_coming_into_line_with_the_document_is_not_reported_as_a_revision():
    """Revising onto the value the document asked for answers no clause: every
    clause on the term is now met, so nothing was waived or revised. Reporting
    it as "Clause  revised" named a move that did not happen, and named it with
    an empty citation (docs/specs/document-clauses, decision 4)."""
    state = attached()
    step(ingest_rfq, state,
         clauses=[
             {"variable": "installation", "value": "modernization",
              "clause": "1.2", "quote": "modernization"},
             {"variable": "service_level", "value": "premium",
              "clause": "4.1", "quote": "24/7 cover"},
         ],
         document_text="tender")
    # off the requirement, then back onto it
    step(reconcile_requirement, state, variable="service_level",
         move="revise", value="standard")
    command = step(reconcile_requirement, state, variable="service_level",
                   move="revise", value="premium")

    said = text(command)
    # the facts the message has to carry: which clause, and that it is met
    assert "Clause 4.1" in said.split("\n")[0]
    assert "Clause  " not in said, "a citation the move could not fill"
    statuses = {e["variable"]: e["status"]
                for e in configuration_module.register(stored(state))}
    assert statuses["service_level"] == "met"
    # and no clause was marked by this move, so nothing may be reported as one
    assert "along with the rest" not in said


def test_a_move_that_answers_some_clauses_still_names_them():
    """The other side of it: a document asking two values of one term has a
    clause to waive and a clause it already meets, and both are named."""
    state = attached()
    step(ingest_rfq, state,
         clauses=[
             {"variable": "building_type", "value": "office",
              "clause": "1.1", "quote": "office"},
             {"variable": "rated_speed", "value": "mps1_6",
              "clause": "3.1", "quote": "1.6 m/s"},
             {"variable": "rated_speed", "value": "mps3_0",
              "clause": "7.4", "quote": "3.0 m/s"},
         ],
         document_text="tender")
    said = text(step(reconcile_requirement, state,
                     variable="rated_speed", move="accept"))
    waived = said.split("\n")[0]
    assert waived.startswith("Waived clause 7.4:") or \
        waived.startswith("Waived clause 3.1:")
    assert "asked for that value and is now met" in said


def test_revising_a_requirement_into_a_collision_returns_repairs():
    state = seeded()
    command = call(reconcile_requirement, state, variable="travel",
                   move="revise", value="low_0_15")
    payload = json.loads(text(command))
    assert payload["kind"] == "repairs"
    assert stored(state)["choices"]["travel"]["value"] == "tower_75_100"


def test_reconciling_an_agreement_with_no_document_is_an_error():
    state = attached()
    command = call(reconcile_requirement, state, variable="rated_speed", move="open")
    assert text(command).startswith("ERROR:")


# -- what the agent reads back --------------------------------------------


def test_get_configuration_names_the_elevator_and_its_only_draft():
    state = attached()
    step(name_workspace, state, name="Riverside Tower — north lift")
    answer = call(get_configuration, state)
    assert "Elevator: Riverside Tower — north lift" in answer
    assert "Draft: Original (the only one)" in answer


def test_get_configuration_asks_for_a_name_when_there_is_none():
    assert "call name_workspace" in call(get_configuration, attached())


def test_get_configuration_lists_the_drafts_when_there_are_several():
    state = attached(priced(building_type="hotel"))
    step(fork_draft_tool, state, name="Premium")
    answer = call(get_configuration, state)
    assert "Drafts:" in answer and "Premium (this one)" in answer
    assert "EUR/month" in answer


def test_get_configuration_says_why_a_forced_value_is_forced():
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    answer = call(get_configuration, state)
    assert "Forced by rules:" in answer
    assert "because every alternative is ruled out by" in answer


def test_get_configuration_of_a_workspace_that_is_gone_still_answers():
    state = {"workspace_id": "does-not-exist", "configuration": empty_configuration()}
    assert "Undecided:" in call(get_configuration, state)


def test_naming_the_elevator_persists_and_mirrors_the_name():
    state = attached()
    command = step(name_workspace, state, name="  Riverside Tower  ")
    assert command.update["workspace_name"] == "Riverside Tower"
    assert workspace_store.get_workspace(state["workspace_id"])["name"] == "Riverside Tower"


def test_an_empty_name_is_refused():
    state = attached()
    assert text(call(name_workspace, state, name="   ")).startswith("ERROR:")


def test_naming_without_a_workspace_says_there_is_nothing_to_name():
    command = call(name_workspace, detached(), name="Riverside Tower")
    assert "nothing to name" in text(command)
    assert set(command.update) == {"messages"}


# -- the in-chat controls (docs/specs/agreement-document) -----------------


def test_ask_choices_carries_the_controls_the_card_renders():
    state = attached()
    step(set_choices, state, choices={"building_type": "hospital"}, source="user")
    payload = json.loads(call(ask_choices, state, variables=["rated_load"],
                              prompt="How big?"))
    assert payload["prompt"] == "How big?"
    variable = payload["variables"][0]
    assert variable["name"] == "rated_load" and variable["control"]
    assert any(o["cheapest"] for o in variable["options"])
    assert {o["status"] for o in variable["options"]} <= {"valid", "invalid", "chosen",
                                                          "forced"}


def test_ask_choices_for_a_variable_that_is_not_there_is_an_error():
    assert call(ask_choices, attached(), variables=["colour"]).startswith("ERROR:")


def test_proposing_a_completion_prices_the_agreement_and_persists_it():
    state = attached()
    step(set_choices, state, choices={"building_type": "hotel"}, source="user")
    command = step(propose_completion, state)
    candidate = stored(state)["candidate"]
    assert candidate["price"] > 0
    assert candidate["footprint"]["total"] > 0
    assert str(candidate["price"]) in text(command)


# -- the catalog (docs/specs/service-agreement) ---------------------------


def test_describe_product_names_every_variable_and_its_codes():
    catalog = configuration_module.describe_product.func()
    for name, variable in configuration_module.MODEL.variables.items():
        assert name in catalog, f"{name} is not in the catalog"
        for option in variable.options:
            assert option.value in catalog, f"{name}={option.value} is not in the catalog"


def test_describe_product_names_every_rule():
    catalog = configuration_module.describe_product.func()
    for constraint in configuration_module.MODEL.constraints:
        assert constraint.id in catalog, f"{constraint.id} is not in the catalog"


def test_the_catalog_prices_only_in_months():
    """The LLM never sees a capital figure it could leak — every price it is
    given is a monthly one (docs/specs/service-agreement)."""
    catalog = configuration_module.describe_product.func()
    assert "EUR/month" in catalog
    for line in catalog.splitlines():
        if "EUR" in line and "EUR/month" not in line:
            assert "shall not exceed" not in line, line
            assert "capital" not in line.lower(), line


def test_the_catalog_carries_the_assessment_assumptions():
    """The only source for a footprint figure or an assumption behind one
    (docs/specs/environmental-footprint)."""
    catalog = configuration_module.describe_product.func()
    assert "Assessment assumptions" in catalog
    assert "kg CO₂e/kWh" in catalog


# -- the one figure both languages format ---------------------------------

# `_format_co2` reimplements `formatCO2` in `src/lib/configurator.ts` in
# integer arithmetic, because Python's own rounding goes half-to-even and that
# one goes half away from zero — the customer reads the lifetime total on the
# sheet and hears it in chat, and 1250 kg read 1.2 t beside 1.3 t. This is the
# Python side's own regression, needing no Node to run; that the two languages
# still agree is checked by running both, in `tests/couplings.test.ts`.
CO2_ROWS = [
    (0, "0 kg CO₂e"),
    (540, "540 kg CO₂e"),
    (999, "999 kg CO₂e"),
    (1000, "1.0 t CO₂e"),
    (1250, "1.3 t CO₂e"),
    (1350, "1.4 t CO₂e"),
    (12400, "12.4 t CO₂e"),
    (-1250, "-1.3 t CO₂e"),
    (-540, "-540 kg CO₂e"),
]


@pytest.mark.parametrize("kg,expected", CO2_ROWS)
def test_a_lifetime_total_reads_the_same_in_chat_as_on_the_sheet(kg, expected):
    assert configuration_module._format_co2(kg) == expected


def test_a_signed_footprint_delta_keeps_its_direction():
    assert configuration_module._signed_co2(1250).startswith("+")
    assert configuration_module._signed_co2(-1250).startswith("−") or \
        configuration_module._signed_co2(-1250).startswith("-")
    assert "0" in configuration_module._signed_co2(0)


def test_the_grammar_dump_still_builds():
    """The frontend's coupling check runs `tests/grammar_dump.py` and compares
    what it prints (docs/specs/offline-checks). Asserted here too, so a renamed
    variable or a moved helper fails in the agent's own suite rather than only
    in the frontend's."""
    from tests import grammar_dump

    dump = grammar_dump.dump()
    # Round-tripped, because what the frontend reads is the JSON and not this
    # dict — the input pairs come back as lists, and the sentences must not.
    reloaded = json.loads(json.dumps(dump))
    assert reloaded["grammar"] == dump["grammar"]
    assert set(dump["grammar"]) and all(dump["grammar"].values())
    assert dump["configurationKeys"] and dump["co2"]
