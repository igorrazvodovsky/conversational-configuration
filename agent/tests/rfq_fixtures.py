"""The two authored RFQs in `agent/fixtures/rfq/`, as the requirement sets an
extraction should produce from them (docs/specs/rfq-reconciliation).

One transcription each, shared by every test that needs one: the solver's seed
tests want the variable/value pairs, the state-transition and tool tests want
the whole clause entries. `test_rfq_fixtures.py` checks each entry against the
document it claims to quote, so a transcription cannot drift from its source.
"""

from pathlib import Path

FIXTURE_DIR = Path(__file__).parent.parent / "fixtures" / "rfq"

# residential-new-build.txt — jointly satisfiable.
RESIDENTIAL_PATH = FIXTURE_DIR / "residential-new-build.txt"
RESIDENTIAL = [
    {"variable": "building_type", "value": "residential", "clause": "2.1",
     "quote": "Riverfield Court Block C is a residential apartment building"},
    {"variable": "region", "value": "europe", "clause": "2.2",
     "quote": "The building is located in the Netherlands"},
    {"variable": "installation", "value": "new_build", "clause": "1.3",
     "quote": "This is a new-build project"},
    {"variable": "travel", "value": "mid_15_30", "clause": "2.3",
     "quote": "Travel height from the lowest served level to the highest is 24 metres"},
    {"variable": "usage_profile", "value": "medium", "clause": "2.4",
     "quote": "The lift is in use throughout the day"},
    {"variable": "rated_load", "value": "kg1000", "clause": "3.1",
     "quote": "Rated load shall be not less than 1000 kg"},
    {"variable": "rated_speed", "value": "mps1_6", "clause": "3.2",
     "quote": "Rated speed shall be 1.6 m/s"},
    {"variable": "accessibility", "value": "en81_70", "clause": "3.3",
     "quote": "The lift shall be accessible in accordance with EN 81-70"},
    {"variable": "service_level", "value": "standard", "clause": "4.3",
     "quote": "Contracted availability shall be no less than 99.5 %"},
]
RESIDENTIAL_BUDGET_CAP = 1200

# office-tower-modernization.txt — over-constrained: clause 3.1's 3.0 m/s
# cannot hold with clause 1.2's modernization.
OFFICE_TOWER_PATH = FIXTURE_DIR / "office-tower-modernization.txt"
OFFICE_TOWER = [
    {"variable": "building_type", "value": "office", "clause": "2.1",
     "quote": "Kranhaus Nord is a commercial office building"},
    {"variable": "region", "value": "europe", "clause": "2.2",
     "quote": "The building is in Frankfurt am Main, Germany"},
    {"variable": "installation", "value": "modernization", "clause": "1.2",
     "quote": "The works are a modernization within the existing shaft"},
    {"variable": "travel", "value": "tower_75_100", "clause": "2.3",
     "quote": "Car no. 3 travels 92 metres"},
    {"variable": "stops", "value": "s13_24", "clause": "2.4",
     "quote": "The car serves 18 landings"},
    {"variable": "usage_profile", "value": "heavy", "clause": "2.5",
     "quote": "in near-constant demand from 07:00"},
    {"variable": "rated_speed", "value": "mps3_0", "clause": "3.1",
     "quote": "Rated speed shall be 3.0 m/s"},
    {"variable": "rated_load", "value": "kg1600", "clause": "3.2",
     "quote": "Rated load shall be 1600 kg"},
    {"variable": "accessibility", "value": "en81_70", "clause": "3.3",
     "quote": "accessible in accordance with EN 81-70"},
    {"variable": "connectivity_package", "value": "connected", "clause": "5.1",
     "quote": "24/7 call-out cover with remote monitoring"},
    {"variable": "service_level", "value": "premium", "clause": "5.2",
     "quote": "availability shall be no less than 99.9 %"},
    {"variable": "contract_term", "value": "y15", "clause": "5.5",
     "quote": "The contract term shall be 15 years"},
]
OFFICE_TOWER_BUDGET_CAP = 1800

DOCUMENTS = [
    ("residential-new-build.txt", RESIDENTIAL_PATH, RESIDENTIAL, RESIDENTIAL_BUDGET_CAP),
    ("office-tower-modernization.txt", OFFICE_TOWER_PATH, OFFICE_TOWER,
     OFFICE_TOWER_BUDGET_CAP),
]


def pairs(requirements: list[dict]) -> list[tuple[str, str]]:
    """The transcription as the solver's seed takes it."""
    return [(r["variable"], r["value"]) for r in requirements]
