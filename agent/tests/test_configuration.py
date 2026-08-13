"""Acceptance tests for docs/specs/agent-tools (pure state transitions)."""

import pytest

from src.configuration import (
    SOLVER,
    adopt_frame,
    apply_choices,
    build_repair_payload,
    empty_configuration,
    frame_comparison,
    make_candidate,
    revise,
    save_frame,
    withdraw_choices,
)
from src.solver import ConflictError


@pytest.fixture()
def empty():
    return empty_configuration()


def test_empty_configuration_all_open(empty):
    assert empty["choices"] == {}
    assert empty["candidate"] is None
    assert all(
        s == "open" for vals in empty["statuses"].values() for s in vals.values()
    )


def test_apply_records_choices_with_provenance(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    config, _ = apply_choices(config, {"region": "europe"}, "agent")
    assert config["choices"]["building_type"] == {"value": "hotel", "source": "user"}
    assert config["choices"]["region"] == {"value": "europe", "source": "agent"}
    assert config["statuses"]["building_type"]["hotel"] == "chosen"
    assert config["statuses"]["region"]["north_america"] == "invalid"


def test_apply_reports_newly_forced(empty):
    config, forced = apply_choices(
        empty, {"building_type": "hospital", "rated_load": "kg2000"}, "user"
    )
    assert forced["car_size"] == "c1500x2700"
    # applying something unrelated afterwards must not re-report it
    _, forced2 = apply_choices(config, {"floor": "pvc"}, "user")
    assert "car_size" not in forced2


def test_apply_conflict_raises_and_reports(empty):
    config, _ = apply_choices(empty, {"installation": "modernization"}, "user")
    with pytest.raises(ConflictError) as exc:
        apply_choices(config, {"rated_speed": "mps3_0"}, "user")
    assert ("installation", "modernization") in exc.value.conflict.choices
    # original config untouched (apply returns new objects; choices unchanged)
    assert list(config["choices"]) == ["installation"]


def test_apply_unknown_variable_and_value(empty):
    with pytest.raises(ValueError, match="unknown variable"):
        apply_choices(empty, {"colour": "red"}, "user")
    with pytest.raises(ValueError, match="unknown value"):
        apply_choices(empty, {"building_type": "airport"}, "user")


def test_candidate_extends_and_prices_monthly(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel", "travel": "tower_75_100"}, "user")
    config = make_candidate(config)
    cand = config["candidate"]
    assert cand["assignment"]["building_type"] == "hotel"
    assert SOLVER.check(cand["assignment"])
    assert cand["price"] == SOLVER.model.monthly(cand["assignment"])


def test_candidate_dropped_when_overridden(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    config = make_candidate(config)
    changed, _ = apply_choices(config, {"building_type": "office"}, "user")
    assert changed["candidate"] is None


def test_candidate_kept_when_still_extending(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    config = make_candidate(config)
    # commit to a value the candidate already contains
    already = config["candidate"]["assignment"]["region"]
    unchanged, _ = apply_choices(config, {"region": already}, "user")
    assert unchanged["candidate"] == config["candidate"]


def test_withdraw_recomputes_and_keeps_extending_candidate(empty):
    config, _ = apply_choices(
        empty, {"building_type": "hospital", "rated_load": "kg2000"}, "user"
    )
    config = make_candidate(config)
    config = withdraw_choices(config, ["rated_load"])
    assert "rated_load" not in config["choices"]
    # hospital alone no longer forces the bed car to a single value
    car = config["statuses"]["car_size"]
    assert sum(1 for s in car.values() if s != "invalid") > 1
    # candidate still extends the remaining choices, so it is kept
    assert config["candidate"] is not None


def test_withdraw_unknown_variable(empty):
    with pytest.raises(ValueError, match="unknown variables"):
        withdraw_choices(empty, ["colour"])


# -- ask_choices payload (docs/specs/configuration-canvas) --------------------------------------

def test_payload_control_heuristic(empty):
    from src.configuration import build_ask_payload
    payload = build_ask_payload(empty, ["building_type", "rated_load", "car_size", "wall_finish"])
    controls = {v["name"]: v["control"] for v in payload["variables"]}
    assert controls == {
        "building_type": "chips",   # short unordered domain
        "rated_load": "scale",      # performance group = ordered
        "car_size": "list",         # forced list despite dimensions group
        "wall_finish": "list",      # forced list
    }


def test_payload_prices_are_monthly_deltas_at_term_in_effect(empty):
    from src.configuration import MODEL, build_ask_payload
    config, _ = apply_choices(empty, {"contract_term": "y10"}, "user")
    payload = build_ask_payload(config, ["door_width", "service_level"])
    by_var = {v["name"]: {o["value"]: o for o in v["options"]} for v in payload["variables"]}
    # hardware: cost basis amortized at the chosen 120-month term
    factor = MODEL.pricing.financing_factor
    assert by_var["door_width"]["d1000"]["price"] == int(600 * factor / 120 + 0.5)
    # agreement: the recurring fee passes through unamortized
    assert by_var["service_level"]["premium"]["price"] == 550


def test_payload_statuses_and_cheapest(empty):
    from src.configuration import apply_choices, build_ask_payload
    config, _ = apply_choices(empty, {"building_type": "hospital", "rated_load": "kg2000"}, "user")
    payload = build_ask_payload(config, ["car_size", "rated_load"])
    car = next(v for v in payload["variables"] if v["name"] == "car_size")
    by_value = {o["value"]: o for o in car["options"]}
    assert by_value["c1500x2700"]["status"] == "forced"
    assert all(o["status"] == "invalid" for v, o in by_value.items() if v != "c1500x2700")
    # cheapest marker appears exactly once per variable and never on an invalid option
    for var in payload["variables"]:
        marked = [o for o in var["options"] if o["cheapest"]]
        assert len(marked) == 1
        assert marked[0]["status"] != "invalid"


def test_payload_unknown_variable(empty):
    from src.configuration import build_ask_payload
    with pytest.raises(ValueError, match="unknown variables"):
        build_ask_payload(empty, ["colour"])


# -- revision (docs/specs/nonlinear-interaction) --------------------------------------------------

def test_revise_passthrough_when_no_conflict(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    revised, forced = revise(config, {"region": "europe"}, [], "user")
    expected, expected_forced = apply_choices(config, {"region": "europe"}, "user")
    assert revised == expected and forced == expected_forced


def test_revise_conflict_raises_leaving_config_untouched(empty):
    config, _ = apply_choices(
        empty, {"installation": "modernization", "rated_speed": "mps1_6"}, "user"
    )
    with pytest.raises(ConflictError):
        revise(config, {"rated_speed": "mps3_0"}, [], "user")
    assert config["choices"]["installation"]["value"] == "modernization"


def test_revise_with_drop_is_atomic(empty):
    config, _ = apply_choices(
        empty, {"installation": "modernization", "rated_speed": "mps1_6"}, "user"
    )
    revised, _ = revise(config, {"rated_speed": "mps3_0"}, ["installation"], "user")
    assert "installation" not in revised["choices"]
    assert revised["choices"]["rated_speed"]["value"] == "mps3_0"
    # ripple of the repair is reflected in statuses
    assert revised["statuses"]["installation"]["new_build"] == "forced"
    assert revised["statuses"]["pit_depth"]["p2100"] == "forced"


def test_repair_payload_modernization(empty):
    config, _ = apply_choices(
        empty, {"installation": "modernization", "rated_speed": "mps1_6"}, "user"
    )
    payload = build_repair_payload(config, {"rated_speed": "mps3_0"})
    assert payload["kind"] == "repairs"
    assert payload["changes"][0]["variable"] == "rated_speed"
    top = payload["repairs"][0]
    assert [d["variable"] for d in top["drop"]] == ["installation"]
    ripple_vars = {r["variable"] for r in top["ripple"]}
    assert {"installation", "pit_depth", "headroom"} <= ripple_vars
    assert top["rules"]


# -- frames (docs/specs/nonlinear-interaction) ----------------------------------------------------

@pytest.fixture()
def with_candidate(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    return make_candidate(config)


def test_save_frame_requires_candidate(empty):
    with pytest.raises(ValueError, match="no candidate"):
        save_frame(empty, "practical")


def test_save_frame_survives_changes(with_candidate):
    config = save_frame(with_candidate, "practical")
    config, _ = apply_choices(config, {"cop": "touch_premium"}, "user")
    assert [f["name"] for f in config["frames"]] == ["practical"]
    assert config["frames"][0]["assignment"] == with_candidate["candidate"]["assignment"]


def test_save_frame_same_name_replaces(with_candidate):
    config = save_frame(with_candidate, "practical")
    config = make_candidate(
        apply_choices(config, {"cop": "touch_premium"}, "user")[0]
    )
    config = save_frame(config, "practical")
    assert len(config["frames"]) == 1
    assert config["frames"][0]["assignment"]["cop"] == "touch_premium"


def test_compare_against_current_candidate(with_candidate):
    config = save_frame(with_candidate, "practical")
    config = make_candidate(
        apply_choices(config, {"cop": "touch_premium"}, "user")[0]
    )
    payload = frame_comparison(config, "practical")
    assert payload["a"]["name"] == "practical"
    assert payload["b"]["isCurrent"] is True
    diff_vars = [d["variable"] for d in payload["differences"]]
    assert "cop" in diff_vars
    assert payload["priceDelta"] == payload["b"]["price"] - payload["a"]["price"]
    # only differing variables appear
    for d in payload["differences"]:
        assert d["a"]["value"] != d["b"]["value"]


def test_compare_across_terms_uses_each_sides_own_term(empty):
    """Two agreements differing in term (and a hardware option): per-side
    hardware deltas are amortized at each side's own term, and the price
    delta is the monthly difference."""
    from src.configuration import MODEL
    config, _ = apply_choices(
        empty, {"building_type": "hotel", "contract_term": "y5", "cop": "standard"}, "user"
    )
    config = save_frame(make_candidate(config), "short")
    config, _ = revise(config, {"contract_term": "y15", "cop": "touch_premium"}, [], "user")
    config = make_candidate(config)

    payload = frame_comparison(config, "short")
    diffs = {d["variable"]: d for d in payload["differences"]}
    assert set(diffs) >= {"contract_term", "cop"}
    factor = MODEL.pricing.financing_factor
    cop_price = MODEL.price_of("cop", "touch_premium")
    assert diffs["cop"]["a"]["price"] == 0  # standard, no cost basis
    assert diffs["cop"]["b"]["price"] == int(cop_price * factor / 180 + 0.5)
    assert payload["priceDelta"] == payload["b"]["price"] - payload["a"]["price"]


def test_compare_unknown_frame(with_candidate):
    with pytest.raises(ValueError, match="no frame named"):
        frame_comparison(with_candidate, "premium")


def test_adopt_frame_replaces_atomically(with_candidate):
    config = save_frame(with_candidate, "practical")
    config, _ = apply_choices(config, {"building_type": "office"}, "user")
    adopted = adopt_frame(config, "practical")
    frame = config["frames"][0]
    assert {v: c["value"] for v, c in adopted["choices"].items()} == frame["assignment"]
    assert all(c["source"] == "user" for c in adopted["choices"].values())
    assert adopted["candidate"] == {"assignment": frame["assignment"], "price": frame["price"]}
    # the frame remains stored after adoption
    assert [f["name"] for f in adopted["frames"]] == ["practical"]
