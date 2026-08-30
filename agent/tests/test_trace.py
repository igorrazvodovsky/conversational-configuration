"""The fact vocabulary a log entry is written in (docs/specs/action-log).

`facts` and `rebuild` are mutual inverses and a delta is their difference, so
what is checked here is that property over agreements the agent actually
builds. Everything a reversal claims rests on it: if a configuration survives
the round trip, running an entry backwards returns the exact state the action
moved away from, and no tool needs an inverse of its own.
"""

import pytest

from src import trace
from src.configuration import (
    apply_choices,
    empty_configuration,
    ingest,
    make_candidate,
    reconcile,
    revise,
    withdraw_choices,
)
from tests.rfq_fixtures import OFFICE_TOWER, OFFICE_TOWER_BUDGET_CAP


def _derived_dropped(config: dict) -> dict:
    return {k: v for k, v in config.items()
            if k not in ("statuses", "unavailable")}


@pytest.fixture
def priced():
    config, _ = apply_choices(empty_configuration(), {"building_type": "hotel"}, "user")
    return make_candidate(config)


@pytest.fixture
def seeded():
    config, _, _ = ingest(empty_configuration(), OFFICE_TOWER,
                          budget_cap=OFFICE_TOWER_BUDGET_CAP)
    return config


def test_an_agreement_survives_being_read_as_facts_and_written_back(priced, seeded):
    for config in (empty_configuration(), priced, seeded):
        assert trace.rebuild(trace.facts(config)) == _derived_dropped(config)


def test_what_the_solver_derives_is_in_no_delta(priced):
    """The argument that kept `statuses` out of a snapshot: there is nothing to
    copy blind, so "re-derived rather than restored" is structural."""
    rebuilt = trace.rebuild(trace.facts(priced))
    assert "statuses" not in rebuilt and "unavailable" not in rebuilt
    assert set(rebuilt) == {"choices", "candidate"}


def _moves(priced, seeded):
    """One before-and-after pair per content transition the tools reach."""
    recorded, _ = apply_choices(empty_configuration(), {"building_type": "hotel"}, "user")
    revised, _ = revise(priced, {"building_type": "office"}, [], "user")
    cleared = withdraw_choices(priced, ["building_type"])
    waived, _, _ = reconcile(seeded, "rated_speed", "accept")
    opened, _, _ = reconcile(seeded, "rated_speed", "open")
    return {
        "set_choices": (empty_configuration(), recorded),
        "propose_completion": (recorded, make_candidate(recorded)),
        "revise_choices": (priced, revised),
        "clear_choices": (priced, cleared),
        "ingest_rfq": (empty_configuration(), seeded),
        "reconcile accept": (seeded, waived),
        "reconcile open": (seeded, opened),
    }


def test_every_transition_is_exactly_reversible(priced, seeded):
    for name, (before, after) in _moves(priced, seeded).items():
        change = trace.delta(before, after)
        assert trace.apply(before, change) == _derived_dropped(after), name
        assert trace.apply(after, trace.invert(change)) == _derived_dropped(before), name


def test_a_batch_that_changed_nothing_has_an_empty_delta(priced):
    change = trace.delta(priced, dict(priced))
    assert change == {"asserted": [], "retracted": []}
    assert not trace.is_reversible(change)
    assert trace.is_reversible(trace.delta(empty_configuration(), priced))


def test_a_delta_names_facts_and_not_store_keys(priced):
    """An entry read alone says what happened, in the vocabulary the ontology
    enumerates."""
    revised, _ = revise(priced, {"building_type": "office"}, [], "agent")
    change = trace.delta(priced, revised)
    assert ["chose", "building_type", "office"] in change["asserted"]
    assert ["attributed", "building_type", "agent"] in change["asserted"]
    assert ["chose", "building_type", "hotel"] in change["retracted"]
    assert {f[0] for f in change["asserted"]} <= {
        "chose", "attributed", "candidate_value", "candidate_price",
        "candidate_footprint", "candidate_objective", "cites", "quote",
        "carries", "requires", "note", "reconciled", "budget_cap"}


def test_a_reconciliation_moves_the_mark_of_the_clause_it_answers(seeded):
    """One disagreement answered once, but the mark is a fact of a clause and
    lands on the clause identity (docs/specs/document-clauses, finding 6)."""
    waived, _, _ = reconcile(seeded, "rated_speed", "accept")
    change = trace.delta(seeded, waived)
    marks = [f for f in change["asserted"] if f[0] == "reconciled"]
    asked = next(c for c in seeded["rfq"]["clauses"]
                 if c.get("variable") == "rated_speed")
    assert marks == [["reconciled", asked["id"], "waived"]]


def test_two_clauses_that_say_the_same_thing_are_two_clauses():
    """A document can leave the clause number and the quote blank, and two
    such clauses are still two: every fact of a clause carries its identity,
    so the two no longer reduce to one triple either way."""
    twice = [{"clause": "", "quote": "", "note": "unreadable"}] * 2
    config, _, _ = ingest(empty_configuration(), OFFICE_TOWER + twice)
    change = trace.delta(empty_configuration(), config)
    notes = [f for f in change["asserted"] if f[0] == "note"]
    assert len(notes) == 2 and notes[0][1] != notes[1][1]
    rebuilt = trace.apply(empty_configuration(), change)["rfq"]["clauses"]
    assert len([c for c in rebuilt if c.get("note") == "unreadable"]) == 2


def test_the_register_comes_back_in_the_order_the_document_was_read_in(seeded):
    """The one ordered structure a configuration holds, and it only ever
    arrives or leaves whole."""
    change = trace.delta(empty_configuration(), seeded)
    gone = trace.apply(seeded, trace.invert(change))
    assert "rfq" not in gone
    assert trace.apply(gone, change)["rfq"] == seeded["rfq"]


def test_a_fact_nothing_rebuilds_raises_rather_than_being_dropped():
    with pytest.raises(ValueError, match="no such fact"):
        trace.rebuild([["undone", "draft", 0]])


def test_a_recorded_value_with_nothing_attributing_it_raises():
    with pytest.raises(ValueError, match="nothing attributing it"):
        trace.rebuild([["chose", "building_type", "hotel"]])
