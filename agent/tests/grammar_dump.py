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
import sys
from pathlib import Path
from typing import get_args

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.configuration import (  # noqa: E402
    MODEL,
    Requirement,
    Source,
    _format_co2,
    empty_configuration,
)
from src.configuration import Configuration as AgentConfiguration  # noqa: E402
from tests import scenario_grammar as grammar  # noqa: E402

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
        # The keys a configuration declares, and the keys one the agent
        # actually built carries — an optional field is in the first and not
        # the second, and the frontend has to read both.
        "configurationKeys": sorted(AgentConfiguration.__annotations__),
        "emptyConfigurationKeys": sorted(empty_configuration()),
        "sourceValues": sorted(get_args(Source)),
        "reconciliationValues": sorted(
            get_args(Requirement.__annotations__["reconciliation"])
        ),
        "co2": [_format_co2(kg) for kg in CO2_INPUTS],
    }


if __name__ == "__main__":
    json.dump(dump(), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
