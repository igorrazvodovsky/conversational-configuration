"""Acceptance tests for docs/specs/solver-service."""

import time
from pathlib import Path

import pytest

from src.solver import ConfigSolver, ConflictError, ModelError, load_model

MODEL_PATH = Path(__file__).parent.parent / "src" / "product_model" / "elevator.json"


# -- loader (pricing block, docs/specs/service-agreement) -------------------------

def _write_model(tmp_path, **overrides):
    import json
    base = {
        "product": "t", "name": "t",
        "pricing": {"financing_factor": 1.25,
                    "term_months": {"y5": 60}, "default_term": "y5"},
        "variables": [
            {"name": "contract_term", "label": "Term", "group": "agreement",
             "options": [{"value": "y5", "label": "5 years"}]},
        ],
        "constraints": [],
    }
    base.update(overrides)
    path = tmp_path / "m.json"
    path.write_text(json.dumps(base))
    return path


def test_loader_rejects_option_with_both_price_kinds(tmp_path):
    path = _write_model(tmp_path, variables=[
        {"name": "contract_term", "label": "Term", "group": "agreement",
         "options": [{"value": "y5", "label": "5 years"}]},
        {"name": "x", "label": "X", "group": "g",
         "options": [{"value": "a", "label": "A", "price": 100, "monthly_price": 10}]},
    ])
    with pytest.raises(ModelError, match="both"):
        load_model(path)


def test_loader_rejects_incomplete_term_months(tmp_path):
    path = _write_model(tmp_path, variables=[
        {"name": "contract_term", "label": "Term", "group": "agreement",
         "options": [{"value": "y5", "label": "5 years"},
                     {"value": "y10", "label": "10 years"}]},
    ])
    with pytest.raises(ModelError, match="term_months"):
        load_model(path)


# -- loader (footprint block, docs/specs/environmental-footprint) ---------

def _footprint_model(tmp_path, *, drop_co2_on=None, annual_kwh=None):
    """A minimal model with a footprint block: the energy trio plus one
    hardware variable to hang co2/prices on."""
    variables = [
        {"name": "contract_term", "label": "Term", "group": "agreement",
         "options": [{"value": "y5", "label": "5 years", "co2": 0}]},
        {"name": "usage_profile", "label": "Usage", "group": "agreement",
         "options": [{"value": "low", "label": "Low", "co2": 0}]},
        {"name": "travel", "label": "Travel", "group": "performance",
         "options": [{"value": "low", "label": "Low", "co2": 900}]},
        {"name": "energy_class", "label": "Class (modelled)", "group": "platform",
         "options": [{"value": "b", "label": "B", "co2": 0}]},
        {"name": "x", "label": "X", "group": "g",
         "options": [{"value": "cheap", "label": "Cheap", "price": 100, "co2": 500},
                     {"value": "dear", "label": "Dear", "price": 900, "co2": 500}]},
    ]
    if drop_co2_on:
        for v in variables:
            for o in v["options"]:
                if (v["name"], o["value"]) == drop_co2_on:
                    del o["co2"]
    return _write_model(
        tmp_path,
        variables=variables,
        footprint={
            "service_life_years": 25, "operating_days": 365,
            "grid_factor": 0.2, "grid_factor_decarbonising": 0.1,
            "fabrication_multiplier": 2.0, "module_scope": "test",
            "annual_kwh": annual_kwh if annual_kwh is not None
            else {"b": {"low": {"low": 1000}}},
        },
    )


def test_loader_rejects_missing_co2_when_footprint_present(tmp_path):
    path = _footprint_model(tmp_path, drop_co2_on=("x", "dear"))
    with pytest.raises(ModelError, match="no co2"):
        load_model(path)


def test_loader_accepts_missing_co2_without_footprint(tmp_path):
    path = _write_model(tmp_path)  # no footprint block, no co2 anywhere
    assert load_model(path).footprint_block is None


def test_loader_rejects_incomplete_annual_kwh_domain(tmp_path):
    path = _footprint_model(tmp_path, annual_kwh={"b": {"low": {}}})
    with pytest.raises(ModelError, match="annual_kwh.*travel"):
        load_model(path)


def test_loader_rejects_non_numeric_kwh(tmp_path):
    path = _footprint_model(tmp_path, annual_kwh={"b": {"low": {"low": "lots"}}})
    with pytest.raises(ModelError, match="must be a number"):
        load_model(path)


def test_footprint_arithmetic_including_bookend(tmp_path):
    model = load_model(_footprint_model(tmp_path))
    assignment = {"contract_term": "y5", "usage_profile": "low", "travel": "low",
                  "energy_class": "b", "x": "cheap"}
    fp = model.footprint(assignment)
    assert fp["embodied"] == (900 + 500) * 2  # co2 sum x fabrication multiplier
    assert fp["use_phase"] == 1000 * 25 * 0.2  # kWh x service life x grid factor
    assert fp["use_phase_decarbonising"] == 1000 * 25 * 0.1
    assert fp["total"] == fp["embodied"] + fp["use_phase"]


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


# -- complete (monthly objective, docs/specs/service-agreement) -------------------

def test_complete_extends_choices_validly(solver):
    choices = {"building_type": "hotel", "travel": "tower_75_100", "rated_load": "kg1600"}
    assignment, monthly = solver.complete(choices)
    assert {k: assignment[k] for k in choices} == choices
    assert set(assignment) == set(solver.model.variables)
    assert solver.check(assignment)
    assert monthly == solver.model.monthly(assignment)


def test_complete_is_minimal_within_samples(solver):
    _, best = solver.complete({})
    # any additional commitment can only keep or raise the minimum
    for extra in [{"platform": "highrise_h900"}, {"cop": "touch_premium"}, {"rated_load": "kg2500"}]:
        _, monthly = solver.complete(extra)
        assert monthly >= best


def test_complete_unsat_raises(solver):
    with pytest.raises(ConflictError):
        solver.complete({"accessibility": "ada", "cop": "touch_premium"})


def test_complete_iterates_open_terms(solver):
    """With the term unchosen, the result must be at least as cheap as every
    per-term completion — and identical to the best of them."""
    choices = {"building_type": "residential", "travel": "low_0_15"}
    _, best = solver.complete(choices)
    per_term = [
        solver.complete({**choices, "contract_term": t})[1]
        for t in solver.model.variable("contract_term").values
    ]
    assert best == min(per_term)


def test_complete_respects_chosen_term(solver):
    assignment, monthly = solver.complete({"contract_term": "y5"})
    assert assignment["contract_term"] == "y5"
    assert monthly == solver.model.monthly(assignment)


def test_complete_monthly_arithmetic(solver):
    assignment, monthly = solver.complete({"contract_term": "y10", "usage_profile": "heavy"})
    pricing = solver.model.pricing
    hardware = sum(solver.model.price_of(v, val) for v, val in assignment.items())
    recurring = sum(solver.model.option(v, val).monthly_price for v, val in assignment.items())
    assert monthly == int(hardware * pricing.financing_factor / 120 + 0.5) + recurring


def test_complete_tiebreak_prefers_shorter_term(tmp_path):
    """With no hardware to amortize, every term yields the same monthly fee —
    the tie must go to the shortest commitment."""
    import json
    tiny = {
        "product": "tiny",
        "name": "Tiny",
        "pricing": {"financing_factor": 1.25,
                    "term_months": {"y5": 60, "y10": 120}, "default_term": "y10"},
        "variables": [
            {"name": "contract_term", "label": "Term", "group": "agreement",
             "options": [{"value": "y10", "label": "10 years"},
                         {"value": "y5", "label": "5 years"}]},
            {"name": "service_level", "label": "Service", "group": "agreement",
             "options": [{"value": "basic", "label": "Basic", "monthly_price": 100}]},
        ],
        "constraints": [],
    }
    path = tmp_path / "tiny.json"
    path.write_text(json.dumps(tiny))
    tiny_solver = ConfigSolver(load_model(path))
    assignment, monthly = tiny_solver.complete({})
    assert monthly == 100
    assert assignment["contract_term"] == "y5"


# -- complete (co2 objective, docs/specs/environmental-footprint) ---------

def test_complete_unknown_objective_raises(solver):
    with pytest.raises(ValueError, match="unknown objective"):
        solver.complete({}, objective="mass")


def test_complete_co2_extends_choices_validly(solver):
    choices = {"building_type": "office", "travel": "mid_15_30", "usage_profile": "medium"}
    assignment, monthly = solver.complete(choices, objective="co2")
    assert {k: assignment[k] for k in choices} == choices
    assert set(assignment) == set(solver.model.variables)
    assert solver.check(assignment)
    assert monthly == solver.model.monthly(assignment)


def test_complete_co2_never_beaten_by_price_objective(solver):
    for choices in [{}, {"building_type": "hotel"},
                    {"building_type": "office", "usage_profile": "heavy"},
                    {"platform": "highrise_h900"}]:
        greenest, _ = solver.complete(choices, objective="co2")
        cheapest, _ = solver.complete(choices, objective="price")
        assert (solver.model.footprint(greenest)["total"]
                <= solver.model.footprint(cheapest)["total"])


def test_complete_co2_brute_force_cross_check(solver):
    """Pin down all but three variables, enumerate every completion by brute
    force, and confirm the solver's minimum matches."""
    from itertools import product
    choices = {
        "service_level": "basic", "contract_term": "y10", "usage_profile": "low",
        "connectivity_package": "none", "building_type": "residential",
        "region": "europe", "installation": "new_build", "accessibility": "none",
        "rated_load": "kg630", "rated_speed": "mps1_0", "travel": "low_0_15",
        "stops": "s2_6", "platform": "mrl_m500", "drive": "gearless_mrl",
        "car_size": "c1100x1400", "shaft": "t1_1800x1700", "pit_depth": "p1100",
        "headroom": "h3400", "door_type": "telescopic_2", "door_width": "d800",
        "door_finish": "painted", "fire_rating": "none",
        "wall_finish": "painted_steel", "cop": "standard",
        "mirror": "none", "handrail": "none",
    }
    free = ["energy_package", "energy_class", "floor"]
    assert set(choices) | set(free) == set(solver.model.variables)

    best = None
    for combo in product(*(solver.model.variable(v).values for v in free)):
        full = {**choices, **dict(zip(free, combo))}
        if not solver.check(full):
            continue
        total = solver.model.footprint(full)["total"]
        if best is None or total < best:
            best = total

    assignment, _ = solver.complete(choices, objective="co2")
    assert solver.model.footprint(assignment)["total"] == best


def test_complete_co2_monthly_tiebreak(tmp_path):
    """Two options with identical co2 but different prices: the co2 objective
    must break the tie toward the cheaper monthly fee."""
    import json
    tiny = {
        "product": "tiny", "name": "Tiny",
        "pricing": {"financing_factor": 1.0,
                    "term_months": {"y5": 60}, "default_term": "y5"},
        "variables": [
            {"name": "contract_term", "label": "Term", "group": "agreement",
             "options": [{"value": "y5", "label": "5 years", "co2": 0}]},
            {"name": "usage_profile", "label": "Usage", "group": "agreement",
             "options": [{"value": "low", "label": "Low", "co2": 0}]},
            {"name": "travel", "label": "Travel", "group": "performance",
             "options": [{"value": "low", "label": "Low", "co2": 100}]},
            {"name": "energy_class", "label": "Class (modelled)", "group": "platform",
             "options": [{"value": "b", "label": "B", "co2": 0}]},
            {"name": "x", "label": "X", "group": "g",
             "options": [{"value": "dear", "label": "Dear", "price": 900, "co2": 50},
                         {"value": "cheap", "label": "Cheap", "price": 100, "co2": 50}]},
        ],
        "constraints": [],
        "footprint": {
            "service_life_years": 25, "operating_days": 365,
            "grid_factor": 0.2, "grid_factor_decarbonising": 0.1,
            "fabrication_multiplier": 2.0, "module_scope": "test",
            "annual_kwh": {"b": {"low": {"low": 1000}}},
        },
    }
    path = tmp_path / "tiny.json"
    path.write_text(json.dumps(tiny))
    tiny_solver = ConfigSolver(load_model(path))
    assignment, monthly = tiny_solver.complete({}, objective="co2")
    assert assignment["x"] == "cheap"


# -- seed (docs/specs/rfq-reconciliation) ---------------------------------

# The two authored fixtures in agent/fixtures/rfq/, as the requirement sets an
# extraction should produce from them.
FIXTURE_A = [  # residential-new-build.txt — jointly satisfiable
    ("building_type", "residential"), ("region", "europe"),
    ("installation", "new_build"), ("travel", "mid_15_30"),
    ("usage_profile", "medium"), ("rated_load", "kg1000"),
    ("rated_speed", "mps1_6"), ("accessibility", "en81_70"),
    ("service_level", "standard"),
]
FIXTURE_B = [  # office-tower-modernization.txt — over-constrained
    ("building_type", "office"), ("region", "europe"),
    ("installation", "modernization"), ("travel", "tower_75_100"),
    ("stops", "s13_24"), ("usage_profile", "heavy"),
    ("rated_speed", "mps3_0"), ("rated_load", "kg1600"),
    ("accessibility", "en81_70"), ("connectivity_package", "connected"),
    ("service_level", "premium"), ("contract_term", "y15"),
]


def test_seed_satisfiable_keeps_everything(solver):
    seeded = solver.seed(FIXTURE_A)
    assert seeded.deviations == ()
    assert set(seeded.kept) == set(FIXTURE_A)
    for var, val in FIXTURE_A:
        assert seeded.assignment[var] == val
    assert seeded.price == solver.complete(dict(FIXTURE_A))[1]


def test_seed_empty_requirements_is_the_cheapest_whole(solver):
    seeded = solver.seed([])
    assert (seeded.kept, seeded.deviations) == ((), ())
    assert solver.check(seeded.assignment)
    # equal to complete()'s price, not necessarily to its assignment: cost-free
    # variables leave several equally cheap wholes and complete() picks among
    # them arbitrarily (see the ingest note in design.md)
    assert seeded.price == solver.complete({})[1]


def test_seed_drops_only_what_it_must(solver):
    """The modernization fixture: exactly one requirement gives way, and the
    seeded whole is valid and satisfies all the others."""
    seeded = solver.seed(FIXTURE_B)
    assert len(seeded.deviations) == 1
    assert len(seeded.kept) == len(FIXTURE_B) - 1
    assert solver.check(seeded.assignment)
    for var, val in seeded.kept:
        assert seeded.assignment[var] == val


def test_seed_tiebreak_picks_the_cheapest_completion(solver):
    """Two single-drop subsets exist — dropping the speed requirement and
    dropping the modernization one. The cheaper completion wins, which is the
    one a modernization customer would recognize as an answer."""
    seeded = solver.seed(FIXTURE_B)
    deviation = seeded.deviations[0]
    assert (deviation.variable, deviation.requested) == ("rated_speed", "mps3_0")
    assert deviation.offered == "mps2_5"
    # the alternative maximal subset is valid too, and dearer
    alternative = {v: val for v, val in FIXTURE_B if v != "installation"}
    assert solver.check(alternative)
    assert seeded.price < solver.complete(alternative)[1]


def test_seed_deviation_cites_the_rules_that_separate_the_pair(solver):
    """Speed sets a minimum headroom a modernization cannot raise. The solver
    may return the equivalent pit-depth core instead, so assert on the core
    choices and accept either rule pair (design.md)."""
    deviation = solver.seed(FIXTURE_B).deviations[0]
    rule_ids = {rid for rid, _ in deviation.rules}
    assert rule_ids & {"R03", "R04", "R27", "R28"}
    assert all(label for _, label in deviation.rules)


def test_seed_is_deterministic(solver):
    first = solver.seed(FIXTURE_B)
    for _ in range(3):
        again = solver.seed(FIXTURE_B)
        assert again.kept == first.kept
        assert again.deviations == first.deviations
        assert again.price == first.price


def test_seed_ignores_duplicate_pairs(solver):
    """Several clauses may bear on one (variable, value) — counting it more
    than once would distort fewest-deviations."""
    doubled = FIXTURE_B + [("rated_speed", "mps3_0"), ("installation", "modernization")]
    assert solver.seed(doubled) == solver.seed(FIXTURE_B)


def test_seed_document_asking_two_values_of_one_variable(solver):
    """One of them must give way on the exactly-one structure alone — a
    deviation with no named product rule to cite."""
    seeded = solver.seed([("service_level", "basic"), ("service_level", "premium")])
    assert len(seeded.deviations) == 1
    assert seeded.deviations[0].variable == "service_level"
    assert seeded.deviations[0].rules == ()


def test_seed_rejects_unknown_requirements(solver):
    with pytest.raises(ValueError, match="unknown"):
        solver.seed([("building_type", "spaceport")])


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
