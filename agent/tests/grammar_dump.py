"""What the agent's own copies of the shared contracts actually produce, as
JSON on stdout (docs/specs/offline-checks).

`tests/couplings.test.ts` at the repo root runs this and compares it against
what the frontend produces from the same inputs. Comparing output rather than
source text is what makes the boundary check behavioural: two sides can hold
the same words and still build different sentences, and only running both
finds that.

    uv run python tests/grammar_dump.py

Every input below has to exist in the live product model, so a renamed variable
or option fails here rather than producing a sentence with a hole in it.
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from typing import get_args

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import workspace_store  # noqa: E402
from src.configuration import (  # noqa: E402
    CONTENT_ACTIONS,
    MODEL,
    Clause,
    Source,
    _format_co2,
    apply_choices,
    configuration_tools,
    empty_configuration,
    ingest,
    is_gesture,
    make_candidate,
)
from src.configuration import Configuration as AgentConfiguration  # noqa: E402
from tests import scenario_grammar as grammar  # noqa: E402
from tests.rfq_fixtures import OFFICE_TOWER, OFFICE_TOWER_BUDGET_CAP  # noqa: E402

# The inputs both sides build from. Named here rather than in either check, so
# the two cannot drift apart by disagreeing about what they compared.
ONE_SELECTION = [("building_type", "hospital")]
TWO_SELECTIONS = [("building_type", "hospital"), ("region", "europe")]
REPAIR_DROP = [("installation", "modernization")]
REPAIR_CHANGES = [("rated_speed", "mps3_0")]
A_DRAFT = 'Premium — "the good one"'
A_VARIABLE = "rated_speed"
A_VALUE = "mps1_6"

# The rounding boundaries that separate the two implementations: Python rounds
# half to even and JavaScript's toLocaleString rounds half away from zero, so
# 1250 kg once read 1.2 t in chat beside 1.3 t on the sheet.
CO2_INPUTS = [0, 540, 999, 1000, 1250, 1350, 12400, -1250, -540, -999]

# Ordinary English the guard must let through: it opens on the grammar's word
# and carries none of its shape (docs/specs/one-gesture-one-action).
NOT_GESTURES = [
    "Set up an elevator for a hospital, 12 floors, busy mornings.",
    "Set the speed to 3.0 m/s.",
    "Setting aside the price for a moment, what does the shaft need?",
    # A dispatched message is nothing but its lines. One of them beside a
    # sentence of the customer's own is prose, and prose is the agent's call.
    "Set Rated speed to 3.0 m/s (rated_speed=mps3_0)\nand tell me what that costs.",
]


def grammar_sentences() -> dict[str, str]:
    """Keyed by the name of the frontend export that must produce the same
    string, so the comparison is one object against another."""
    return {
        "CANVAS_EDIT_PREFIX": grammar.CANVAS_EDIT_PREFIX,
        "choiceMessage": grammar.choice_message(MODEL, ONE_SELECTION),
        "choiceMessage/two": grammar.choice_message(MODEL, TWO_SELECTIONS),
        "canvasEditMessage": grammar.canvas_edit_message(MODEL, ONE_SELECTION),
        "repairMessage": grammar.repair_message(MODEL, REPAIR_DROP, REPAIR_CHANGES),
        "repairMessage/noDrop": grammar.repair_message(MODEL, [], REPAIR_CHANGES),
        "abandonMessage": grammar.ABANDON_MESSAGE,
        "acceptOfferedMessage": grammar.accept_offered_message(
            MODEL, A_VARIABLE, A_VALUE),
        "reviseRequirementMessage": grammar.revise_requirement_message(
            MODEL, A_VARIABLE, A_VALUE),
        "leaveOpenMessage": grammar.leave_open_message(MODEL, A_VARIABLE),
        "forkDraftMessage": grammar.FORK_DRAFT_MESSAGE,
        "switchDraftMessage": grammar.switch_draft_message(A_DRAFT),
        "discardDraftMessage": grammar.discard_draft_message(A_DRAFT),
        "compareDraftMessage": grammar.compare_draft_message(A_DRAFT),
        "undoMessage": grammar.UNDO_MESSAGE,
        "redoMessage": grammar.REDO_MESSAGE,
    }


def configurations() -> dict:
    """Agreements the agent actually built, for the frontend checks to hold
    their own fixtures against.

    A fixture assembled by hand can be valid in shape and impossible in fact —
    statuses saying every option is open beside a recorded choice, or a value
    marked forced while its siblings stay open, neither of which the solver
    ever produces. These are the real thing, so the invariants can be read off
    them rather than asserted from memory.
    """
    chosen, _ = apply_choices(empty_configuration(), {"building_type": "hospital"}, "user")
    seeded, _, _ = ingest(
        empty_configuration(), OFFICE_TOWER, budget_cap=OFFICE_TOWER_BUDGET_CAP
    )
    return {
        "empty": empty_configuration(),
        "chosen": chosen,
        "priced": make_candidate(chosen),
        "seeded": seeded,
    }


def _log_entry(standing: str, n: int, facts: bool = True) -> dict:
    return {
        "id": f"entry-{n}",
        "action": "set_choices",
        "source": "user",
        "conversation": None,
        "at": "2026-08-21T00:00:00+00:00",
        "standing": standing,
        "asserted": [["chose", "building_type", "hotel"]] if facts else [],
        "retracted": [],
    }


def log_fixture() -> list[dict]:
    """A log holding every case the counts turn on, and more reversible entries
    than the cursor may walk back through (docs/specs/action-log).

    The invariant it keeps is the one the store maintains: every applied or
    abandoned entry precedes every reversed one. Both languages compute the
    canvas's two counts from a log, because the agent refreshes that mirror on
    every commit and the frontend seeds it on attach, so the frontend check
    holds its own function against the depths printed beside this.
    """
    entries = [_log_entry("applied", n) for n in range(12)]
    entries.append(_log_entry("applied", 12, facts=False))
    entries += [_log_entry("abandoned", n) for n in range(13, 15)]
    entries += [_log_entry("reversed", n) for n in range(15, 18)]
    entries.append(_log_entry("reversed", 18, facts=False))
    return entries


def log_fixture_depths() -> dict:
    record = {"drafts": [{"id": "draft-1", "log": log_fixture()}],
              "currentDraftId": "draft-1"}
    return workspace_store.history_depths(record)


def record_shapes() -> dict:
    """The keys the durable record actually carries, built rather than read
    from the source, so an optional key added by a later write is in it. Runs
    against a temp store — a check must never write into the developer's own
    agreements (docs/specs/conversation-checks design)."""
    outer = os.environ.get("WORKSPACE_STORE_DIR")
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["WORKSPACE_STORE_DIR"] = tmp
        try:
            record = workspace_store.create_workspace(empty_configuration())
            record = workspace_store.attach_rfq(record["id"], "a document")
            # One action, so an entry's own keys are built rather than
            # described (docs/specs/action-log). Without it a key added to an
            # entry would be a durable record key nothing has to account for.
            chosen, _ = apply_choices(
                empty_configuration(), {"building_type": "hospital"}, "user")
            record = workspace_store.save_configuration(
                record["id"], chosen, "set_choices", "user")
        finally:
            # Restored, not cleared: a caller that set its own override — the
            # conversation checks do, per call — must get it back.
            if outer is None:
                os.environ.pop("WORKSPACE_STORE_DIR", None)
            else:
                os.environ["WORKSPACE_STORE_DIR"] = outer
    return {
        "workspaceKeys": sorted(record),
        "draftKeys": sorted(record["drafts"][0]),
        "entryKeys": sorted(workspace_store.draft_log(record)[0]),
    }


def dump() -> dict:
    return {
        "inputs": {
            "oneSelection": ONE_SELECTION,
            "twoSelections": TWO_SELECTIONS,
            "repairDrop": REPAIR_DROP,
            "repairChanges": REPAIR_CHANGES,
            "draftName": A_DRAFT,
            "variable": A_VARIABLE,
            "value": A_VALUE,
            "co2": CO2_INPUTS,
        },
        "grammar": grammar_sentences(),
        # Which of those sentences `set_choices` refuses, run through the
        # real predicate rather than described (docs/specs/one-gesture-one-
        # action). Computed on the agent's copies, which the check above has
        # already asserted are the frontend's character for character.
        "guarded": sorted(k for k, v in grammar_sentences().items() if is_gesture(v)),
        # Prose that opens on the same word, which must not be refused.
        "guardedProse": [is_gesture(text) for text in NOT_GESTURES],
        # The keys a configuration declares, and the keys one the agent
        # actually built carries — an optional field is in the first and not
        # the second, and the frontend has to read both.
        "configurationKeys": sorted(AgentConfiguration.__annotations__),
        "emptyConfigurationKeys": sorted(empty_configuration()),
        "sourceValues": sorted(get_args(Source)),
        # A mark is optional on a clause — two of the three kinds take none —
        # so the Literal sits inside a NotRequired and is unwrapped once.
        "reconciliationValues": sorted(
            get_args(get_args(Clause.__annotations__["reconciliation"])[0])
        ),
        "co2": [_format_co2(kg) for kg in CO2_INPUTS],
        "configurations": configurations(),
        # The population the ontology has to name (constitution #15,
        # docs/specs/ontology-of-phenomena). The ontology is prose and can only
        # be read, so what crosses is what it has to account for: every action
        # the agent offers, every individual the product model declares, and
        # every key of the durable record.
        "toolNames": sorted(t.name for t in configuration_tools),
        # Every name an entry of a draft's log may carry, and how far the
        # cursor may walk back through one (docs/specs/action-log). Enumerable
        # without a run, so the check can assert the set rather than restate
        # the rule that produces it.
        "contentActions": sorted(CONTENT_ACTIONS),
        "reversalReach": workspace_store.HISTORY_DEPTH,
        "logFixture": log_fixture(),
        "logFixtureDepths": log_fixture_depths(),
        "variables": sorted(MODEL.variables),
        "groups": sorted({v.group for v in MODEL.variables.values()}),
        "ruleIds": [c.id for c in MODEL.constraints],
        **record_shapes(),
    }


if __name__ == "__main__":
    json.dump(dump(), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
