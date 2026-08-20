"""The product-model validator, run as part of the default suite.

`validate.py` checks the elevator model itself (docs/specs/product-model):
global satisfiability, dead options, the intended forcings and conflicts, the
pricing sanity checks, and the footprint invariants including the embodied
calibration against the EPD anchor (docs/specs/environmental-footprint). It is
the strongest check in the repo on the artifact constitution #2 makes
everything else derive from, and until this test existed it ran only when
someone remembered to type the command.

It stays runnable on its own — `uv run python src/product_model/validate.py`
prints the same report and sets the exit code — because the report is what a
developer changing the model wants to read. Here the printing is captured, and
pytest shows it only when the model has actually broken.
"""

from src.product_model import validate
from src.product_model.reference import REFERENCE
from src.solver import ConfigSolver, load_model


def test_the_model_validates():
    assert validate.main() == 0, "see the captured report above for what failed"


def test_the_reference_configuration_covers_every_variable():
    """The validator says this too, in its own report. Asserted separately so a
    variable added to the model without a reference value names itself rather
    than arriving as one line inside a failed run."""
    model = load_model(validate.MODEL_PATH)
    assert set(REFERENCE) == set(model.variables)


def test_the_reference_configuration_is_valid():
    model = load_model(validate.MODEL_PATH)
    assert ConfigSolver(model).check(REFERENCE)
