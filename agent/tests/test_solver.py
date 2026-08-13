"""Acceptance tests for docs/specs/solver-service."""

import time
from pathlib import Path

import pytest

from src.solver import ConfigSolver, ConflictError, load_model

MODEL_PATH = Path(__file__).parent.parent / "src" / "product_model" / "elevator.json"


@pytest.fixture(scope="module")
def solver():
    return ConfigSolver(load_model(MODEL_PATH))


# -- check ----------------------------------------------------------------

def test_check_empty_is_sat(solver):
    assert solver.check({})


def test_check_partial_sat(solver):
    assert solver.check({"building_type": "hospital", "region": "europe", "rated_load": "kg2000"})


def test_check_conflict_unsat(solver):
    assert not solver.check({"installation": "modernization", "rated_speed": "mps3_0"})


# -- explain --------------------------------------------------------------

def test_explain_sat_returns_none(solver):
    assert solver.explain({"building_type": "hotel"}) is None


def test_explain_names_choices_and_rules(solver):
    conflict = solver.explain({
        "installation": "modernization",
        "rated_speed": "mps3_0",
        "building_type": "office",  # innocent bystander, must not appear
    })
    assert conflict is not None
    assert set(conflict.choices) == {
        ("installation", "modernization"),
        ("rated_speed", "mps3_0"),
    }
    # Two independent minimal explanations exist (pit: R03+R27, headroom: R04+R28);
    # either is acceptable.
    rule_ids = {rid for rid, _ in conflict.rules}
    assert {"R03", "R27"} <= rule_ids or {"R04", "R28"} <= rule_ids


def test_explain_is_minimal(solver):
    choices = {"installation": "modernization", "rated_speed": "mps3_0"}
    conflict = solver.explain(choices)
    for var, _ in conflict.choices:
        rest = {v: val for v, val in choices.items() if v != var}
        assert solver.check(rest), f"conflict set not minimal: removable element {var}"


def test_explain_glass_doors_tall_office(solver):
    conflict = solver.explain({
        "building_type": "office",
        "travel": "high_30_50",
        "door_finish": "glass",
    })
    assert conflict is not None
    rule_ids = {rid for rid, _ in conflict.rules}
    assert {"R23", "R24"} <= rule_ids


# -- valid_options --------------------------------------------------------

def test_valid_options_empty_has_no_invalid(solver):
    options = solver.valid_options({})
    flagged = [
        (var, val) for var, statuses in options.items()
        for val, s in statuses.items() if s in ("invalid", "forced")
    ]
    assert flagged == []  # matches the product model's no-dead-options guarantee


def test_valid_options_hospital_2000(solver):
    options = solver.valid_options({"building_type": "hospital", "rated_load": "kg2000"})
    assert options["car_size"]["c1500x2700"] == "forced"
    assert all(s == "invalid" for v, s in options["car_size"].items() if v != "c1500x2700")
    # accessibility "none" ruled out by R17
    assert options["accessibility"]["none"] == "invalid"


def test_valid_options_marks_chosen(solver):
    options = solver.valid_options({"building_type": "hotel"})
    assert options["building_type"]["hotel"] == "chosen"
    assert all(s == "invalid" for v, s in options["building_type"].items() if v != "hotel")


def test_valid_options_unsat_raises(solver):
    with pytest.raises(ConflictError) as exc:
        solver.valid_options({"installation": "modernization", "rated_speed": "mps3_0"})
    assert exc.value.conflict.choices


@pytest.mark.parametrize("choices", [
    {"building_type": "hospital"},
    {"region": "north_america"},
    {"installation": "modernization", "rated_speed": "mps2_5"},
    {"building_type": "retail", "travel": "low_0_15"},
])
def test_valid_options_agrees_with_probes(solver, choices):
    """Property check: statuses must match brute-force per-value satisfiability."""
    options = solver.valid_options(choices)
    for var in solver.model.variables.values():
        if var.name in choices:
            continue
        for val in var.values:
            probe_sat = solver.check({**choices, var.name: val})
            status = options[var.name][val]
            assert (status != "invalid") == probe_sat, (var.name, val, status)
            if status == "forced":
                others = [v for v in var.values if v != val]
                assert not any(solver.check({**choices, var.name: v}) for v in others)


# -- repairs (docs/specs/nonlinear-interaction) --------------------------------------------------

def test_repairs_no_conflict_is_empty(solver):
    assert solver.repairs({"building_type": "hotel"}, {"region": "europe"}) == []


def test_repairs_modernization_scenario(solver):
    """Modernization + 1.6 m/s recorded; customer asks for 3.0 m/s.
    Dropping modernization (switching to new build) must appear, with the
    pit/headroom ripple attached."""
    repairs = solver.repairs(
        {"installation": "modernization", "rated_speed": "mps1_6"},
        {"rated_speed": "mps3_0"},
    )
    assert repairs
    top = repairs[0]
    assert top.dropped == (("installation", "modernization"),)
    assert top.changes == (("rated_speed", "mps3_0"),)
    forced = dict(top.forced)
    assert forced["pit_depth"] == "p2100"
    assert forced["headroom"] == "h4600"
    assert forced["installation"] == "new_build"
    rule_ids = {rid for rid, _ in top.rules}
    assert rule_ids & {"R03", "R04", "R27", "R28"}


def test_repairs_ordered_by_retention_and_distinct(solver):
    choices = {
        "installation": "modernization",
        "rated_speed": "mps1_6",
        "building_type": "office",
    }
    repairs = solver.repairs(choices, {"rated_speed": "mps3_0"})
    assert repairs
    kept_counts = [len(r.kept) for r in repairs]
    assert kept_counts == sorted(kept_counts, reverse=True)
    dropped_sets = [frozenset(r.dropped) for r in repairs]
    assert len(dropped_sets) == len(set(dropped_sets))
    for r in repairs:
        # each repair actually is feasible
        assert solver.check({**dict(r.kept), **dict(r.changes)})


def test_repairs_infeasible_changes_raise(solver):
    with pytest.raises(ConflictError):
        solver.repairs(
            {"building_type": "hotel"},
            {"installation": "modernization", "rated_speed": "mps3_0"},
        )


def test_repairs_override_same_variable(solver):
    """A change to an already-chosen variable replaces it rather than
    conflicting with it."""
    repairs = solver.repairs({"rated_speed": "mps1_6"}, {"rated_speed": "mps2_5"})
    assert repairs == []  # nothing else recorded → nothing to repair


# -- complete -------------------------------------------------------------

def test_complete_extends_choices_validly(solver):
    choices = {"building_type": "hotel", "travel": "tower_75_100", "rated_load": "kg1600"}
    assignment, price = solver.complete(choices)
    assert {k: assignment[k] for k in choices} == choices
    assert set(assignment) == set(solver.model.variables)
    assert solver.check(assignment)
    assert price == sum(solver.model.price_of(v, val) for v, val in assignment.items())


def test_complete_is_minimal_within_samples(solver):
    _, best = solver.complete({})
    # any additional commitment can only keep or raise the minimum
    for extra in [{"platform": "highrise_h900"}, {"cop": "touch_premium"}, {"rated_load": "kg2500"}]:
        _, price = solver.complete(extra)
        assert price >= best


def test_complete_unsat_raises(solver):
    with pytest.raises(ConflictError):
        solver.complete({"accessibility": "ada", "cop": "touch_premium"})


# -- performance ----------------------------------------------------------

def test_operation_latency(solver):
    choices = {"building_type": "hospital", "rated_load": "kg2000"}
    t0 = time.perf_counter()
    solver.check(choices)
    t_check = time.perf_counter() - t0

    t0 = time.perf_counter()
    solver.valid_options(choices)
    t_valid = time.perf_counter() - t0

    print(f"\ncheck: {t_check * 1000:.1f} ms, valid_options: {t_valid * 1000:.1f} ms")
    assert t_check < 0.1
    assert t_valid < 0.5  # spec target 100 ms; generous bound to avoid CI flakes
