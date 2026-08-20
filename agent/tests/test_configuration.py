"""Acceptance tests for docs/specs/agent-tools (pure state transitions)."""

import json

import pytest

from src.configuration import (
    MODEL,
    SOLVER,
    apply_choices,
    build_repair_payload,
    describe_restoration,
    draft_comparison,
    empty_configuration,
    ingest,
    keep_as_is,
    make_candidate,
    reconcile,
    record_choices,
    register,
    restore,
    revise,
    snapshot,
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


def test_record_keeps_what_fits_and_names_what_does_not(empty):
    """A batch with one collision in it records everything else, and hands back
    the collision with its rules (docs/specs/agent-tools). Losing the innocent
    choices used to let the next completion invent replacements for them."""
    stated = {
        "building_type": "office",
        "region": "europe",
        "travel": "mid_15_30",
        "stops": "s13_24",
    }
    config, _, declined = record_choices(empty, stated, "user")
    assert set(config["choices"]) == {"building_type", "region"}
    assert {d["variable"] for d in declined} == {"travel", "stops"}
    assert all(d["rules"] for d in declined)
    assert "R14" in {r["id"] for d in declined for r in d["rules"]}
    # every declined value is the one the customer stated, reported back verbatim
    assert {d["variable"]: d["value"] for d in declined} == {
        "travel": "mid_15_30", "stops": "s13_24"}


def test_record_declines_the_new_choice_not_the_agreed_one(empty):
    """A new choice that collides with something already recorded is the one
    declined; what the customer agreed earlier is never quietly dropped."""
    config, _ = apply_choices(empty, {"installation": "modernization"}, "user")
    after, _, declined = record_choices(config, {"rated_speed": "mps3_0"}, "user")
    assert after["choices"]["installation"]["value"] == "modernization"
    assert "rated_speed" not in after["choices"]
    assert [d["variable"] for d in declined] == ["rated_speed"]
    # Which minimal core Z3 returns is its own business — pit depth and
    # headroom each separate these two — so what is asserted is that the rules
    # are the model's own, named, and about the modernization.
    ids = {r["id"] for d in declined for r in d["rules"]}
    assert ids <= {c.id for c in MODEL.constraints}
    assert ids & {"R27", "R28"}


def test_record_without_conflict_behaves_like_apply(empty):
    config, forced, declined = record_choices(
        empty, {"building_type": "hotel", "region": "europe"}, "user")
    assert declined == []
    assert set(config["choices"]) == {"building_type", "region"}
    assert forced == apply_choices(
        empty, {"building_type": "hotel", "region": "europe"}, "user")[1]


def test_keeping_as_is_cannot_move_the_agreement():
    """Declining a change is answered by a tool that holds no configuration in
    its update and writes no history, so the agreement cannot move however the
    model reaches for it (docs/specs/nonlinear-interaction). The defect this
    replaces was the model answering the abandon message with undo_change,
    which threw away the change *before* the one the customer declined."""

    class Runtime:
        tool_call_id = "call-1"
        state: dict = {}

    update = keep_as_is.func(runtime=Runtime()).update
    assert set(update) == {"messages"}
    assert "configuration" not in update


def test_unavailable_answers_the_swap_not_the_choice(empty):
    """A decided term still offers its alternatives: `unavailable` is computed
    with the variable's own choice lifted, so it says what could be taken
    instead (docs/specs/agreement-document). No rule in the model touches
    contract_term, so recording one may not rule the others out."""
    config, _ = apply_choices(empty, {"contract_term": "y15"}, "user")
    assert config["statuses"]["contract_term"]["y5"] == "invalid"  # under the choice
    assert "contract_term" not in config["unavailable"]  # as a swap, all three stand


def test_unavailable_names_the_rules(empty):
    """Every option that cannot be taken carries the rules that say so
    (constitution #6)."""
    config, _ = apply_choices(empty, {"building_type": "hospital"}, "user")
    out = config["unavailable"]["accessibility"]["none"]
    assert {r["id"] for r in out} & {"R17", "R18"}
    assert all(r["label"] for r in out)
    assert all(
        rid in {c.id for c in MODEL.constraints}
        for rules in config["unavailable"].values()
        for rule_list in rules.values()
        for rid in [r["id"] for r in rule_list]
    )


def test_unavailable_is_rebuilt_on_restore(empty):
    """Derived state cannot survive an undo stale, or the document starts
    explaining an agreement that is no longer there."""
    config, _ = apply_choices(empty, {"building_type": "hospital"}, "user")
    revived = restore(snapshot(config))
    # Which options are out is the assertion; *which* minimal core Z3 hands
    # back for one of them can differ between two runs of the same question,
    # and either core is a true one.
    assert {v: set(vals) for v, vals in revived["unavailable"].items()} == {
        v: set(vals) for v, vals in config["unavailable"].items()
    }
    assert revived["unavailable"]["accessibility"]["none"]


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


def test_candidate_repriced_when_overridden(empty):
    """A change invalidates the standing candidate, and the agreement is
    completed again on the same objective rather than left unpriced."""
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    config = make_candidate(config)
    changed, _ = apply_choices(config, {"building_type": "office"}, "user")
    assert changed["candidate"] is not None
    assert changed["candidate"]["assignment"] != config["candidate"]["assignment"]
    assert changed["candidate"]["assignment"]["building_type"] == "office"
    assert changed["candidate"]["objective"] == config["candidate"]["objective"]


def test_repricing_moves_only_what_the_edit_moved(empty):
    """A reprice may not churn values nobody touched. Cost-free variables leave
    many equally cheap completions, so re-solving from scratch flipped car
    height, shaft size and pit depth on a cabin-finish edit; the previous
    assignment is passed as a tie-break to stop that."""
    config, _ = apply_choices(empty, {
        "building_type": "office", "region": "europe", "installation": "new_build",
        "travel": "high_30_50", "stops": "s13_24", "usage_profile": "heavy",
        "rated_load": "kg1000", "contract_term": "y15",
    }, "user")
    config = make_candidate(config)
    before = config["candidate"]["assignment"]
    after, _ = apply_choices(config, {"wall_finish": "brushed_ss"}, "user")
    moved = {v for v in before if before[v] != after["candidate"]["assignment"][v]}
    assert moved == {"wall_finish"}
    # and the tie-break never buys a worse price
    assert after["candidate"]["price"] == config["candidate"]["price"] + 16


def test_a_greener_candidate_stays_green_across_a_change(empty):
    """The reprice keeps the objective the customer asked for."""
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    config = make_candidate(config, "co2")
    changed, _ = apply_choices(config, {"contract_term": "y10"}, "user")
    assert changed["candidate"]["objective"] == "co2"


def test_an_unpriced_agreement_stays_unpriced(empty):
    """Pricing is asked for, never assumed: a change to an agreement that has
    no candidate does not invent one."""
    changed, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
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


# -- ask_choices payload (docs/specs/agreement-document) ----------------------------------------

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


# -- comparing drafts (docs/specs/parallel-drafts) ------------------------

@pytest.fixture()
def with_candidate(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    return make_candidate(config)


def test_compare_two_drafts(with_candidate):
    """Both sides are whole documents, and only what differs is listed."""
    other = make_candidate(
        apply_choices(with_candidate, {"cop": "touch_premium"}, "user")[0]
    )
    payload = draft_comparison("Original", with_candidate, "Premium", other, True)
    assert payload["kind"] == "draft_comparison"
    assert payload["a"]["name"] == "Original"
    assert payload["b"]["name"] == "Premium"
    assert payload["b"]["isCurrent"] is True
    assert "cop" in [d["variable"] for d in payload["differences"]]
    assert payload["priceDelta"] == payload["b"]["price"] - payload["a"]["price"]
    for d in payload["differences"]:
        assert d["a"]["value"] != d["b"]["value"]


def test_compare_needs_a_priced_candidate_on_each_side(with_candidate, empty):
    """A draft that has never been completed has no price to compare with, and
    the tool says what to do about it rather than solving for it. Editing a
    draft no longer costs it its price, so this is the only way to get there."""
    unpriced, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    assert unpriced["candidate"] is None
    with pytest.raises(ValueError, match="propose a completion"):
        draft_comparison("Premium", unpriced, "Original", with_candidate)


def test_compare_across_terms_uses_each_sides_own_term(empty):
    """Two drafts differing in term (and a hardware option): per-side hardware
    deltas are amortized at each side's own term, and the price delta is the
    monthly difference."""
    from src.configuration import MODEL
    config, _ = apply_choices(
        empty, {"building_type": "hotel", "contract_term": "y5", "cop": "standard"}, "user"
    )
    short = make_candidate(config)
    long_config, _ = revise(short, {"contract_term": "y15", "cop": "touch_premium"}, [], "user")
    long_term = make_candidate(long_config)

    payload = draft_comparison("Short term", short, "Long term", long_term)
    diffs = {d["variable"]: d for d in payload["differences"]}
    assert set(diffs) >= {"contract_term", "cop"}
    factor = MODEL.pricing.financing_factor
    cop_price = MODEL.price_of("cop", "touch_premium")
    assert diffs["cop"]["a"]["price"] == 0  # standard, no cost basis
    assert diffs["cop"]["b"]["price"] == int(cop_price * factor / 180 + 0.5)
    assert payload["priceDelta"] == payload["b"]["price"] - payload["a"]["price"]


# -- footprint (docs/specs/environmental-footprint) -----------------------

def test_candidate_carries_footprint(with_candidate):
    from src.configuration import MODEL
    cand = with_candidate["candidate"]
    fp = MODEL.footprint(cand["assignment"])
    assert cand["footprint"] == {"embodied": fp["embodied"], "use_phase": fp["use_phase"],
                                 "total": fp["total"]}


def test_candidate_with_co2_objective(empty):
    from src.configuration import MODEL
    config, _ = apply_choices(empty, {"building_type": "office", "usage_profile": "medium"}, "user")
    cheapest = make_candidate(config, "price")["candidate"]
    greenest = make_candidate(config, "co2")["candidate"]
    assert greenest["footprint"]["total"] <= cheapest["footprint"]["total"]
    assert SOLVER.check(greenest["assignment"])


def test_comparison_footprint_delta(empty):
    """The cheapest-versus-greenest pair, as two drafts."""
    config, _ = apply_choices(empty, {"building_type": "office", "usage_profile": "medium"}, "user")
    cheapest = make_candidate(config, "price")
    greenest = make_candidate(config, "co2")
    payload = draft_comparison("Cheapest", cheapest, "Lowest footprint", greenest)
    a, b = payload["a"]["footprint"], payload["b"]["footprint"]
    assert a and b
    assert payload["footprintDelta"] == b["total"] - a["total"]
    # The card renders this string and the agent is told to quote it, so the
    # sheet and the prose beside it cannot disagree about one figure.
    from src.configuration import _format_co2
    assert payload["footprintDeltaText"] == _format_co2(abs(payload["footprintDelta"]))


def test_comparison_pre_footprint_draft_fallback(empty):
    """A draft adapted from a workspace written before the footprint feature
    has no footprint key: the payload carries None for that side and a delta
    of 0."""
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    old = make_candidate(config)
    del old["candidate"]["footprint"]
    payload = draft_comparison("Original", old, "Premium", make_candidate(config))
    assert payload["a"]["footprint"] is None
    assert payload["b"]["footprint"] is not None
    assert payload["footprintDelta"] == 0
    assert payload["footprintDeltaText"] is None


def test_completion_message_teaser(empty):
    """When the two objectives disagree, the propose message ends with the
    pair teaser: how many variables differ and both deltas."""
    from src.configuration import MODEL, _chosen_values, completion_message
    config, _ = apply_choices(
        empty, {"building_type": "office", "travel": "mid_15_30", "usage_profile": "medium"},
        "user")
    config = make_candidate(config, "price")
    other_assignment, other_price = SOLVER.complete(_chosen_values(config), "co2")
    message = completion_message(config["candidate"], "price", other_assignment, other_price)
    assert "cheapest monthly completion" in message
    teaser = message.splitlines()[-1]
    n = sum(1 for v, val in other_assignment.items()
            if config["candidate"]["assignment"][v] != val)
    assert f"lowest-footprint completion differs in {n} variable" in teaser
    assert "t CO₂e" in teaser and "EUR/month" in teaser and "offer to show the pair" in teaser


def test_completion_message_no_teaser_when_objectives_agree(empty):
    """A fully-specified configuration completes identically under both
    objectives — no teaser line."""
    from src.configuration import _chosen_values, completion_message
    full = {
        "service_level": "basic", "contract_term": "y10", "usage_profile": "low",
        "connectivity_package": "none", "building_type": "residential",
        "region": "europe", "installation": "new_build", "accessibility": "none",
        "rated_load": "kg630", "rated_speed": "mps1_0", "travel": "low_0_15",
        "stops": "s2_6", "platform": "mrl_m500", "drive": "gearless_mrl",
        "energy_package": "standard", "energy_class": "c",
        "car_size": "c1100x1400", "car_height": "ch2200",
        "shaft": "t1_1800x1700", "pit_depth": "p1100",
        "headroom": "h3400", "door_type": "telescopic_2", "door_width": "d800",
        "door_finish": "painted", "fire_rating": "none",
        "wall_finish": "painted_steel", "floor": "rubber", "cop": "standard",
        "mirror": "none", "handrail": "none", "lead_time": "standard",
        "dispatch_control": "collective", "rescue_operation": "ard",
        "firefighters_operation": "none", "access_control": "none",
    }
    config, _ = apply_choices(empty, full, "user")
    config = make_candidate(config)
    other_assignment, other_price = SOLVER.complete(_chosen_values(config), "co2")
    message = completion_message(config["candidate"], "price", other_assignment, other_price)
    assert "offer to show the pair" not in message


# -- RFQ reconciliation (docs/specs/rfq-reconciliation) -------------------

# The over-constrained fixture (agent/fixtures/rfq/office-tower-modernization.txt)
# as an extraction should produce it: clause 3.1's 3.0 m/s cannot hold with
# clause 1.2's modernization.
FIXTURE_B = [
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


@pytest.fixture()
def seeded(empty):
    config, _, _ = ingest(empty, FIXTURE_B, [], budget_cap=1800)
    return config


def test_ingest_records_every_kept_requirement_with_document_provenance(seeded):
    sources = {c["source"] for c in seeded["choices"].values()}
    assert sources == {"document"}
    assert seeded["choices"]["installation"] == {"value": "modernization",
                                                 "source": "document"}
    # the one requirement the rules cannot meet is not recorded as a choice
    assert "rated_speed" not in seeded["choices"]


def test_ingest_freezes_the_document_and_seeds_a_valid_whole(seeded):
    stored = seeded["rfq"]["requirements"]
    assert len(stored) == len(FIXTURE_B)
    assert all(r["reconciliation"] == "pending" for r in stored)
    assert {(r["variable"], r["clause"], r["quote"]) for r in stored} == {
        (r["variable"], r["clause"], r["quote"]) for r in FIXTURE_B
    }
    assert seeded["rfq"]["budget_cap"] == 1800
    assert seeded["candidate"]["assignment"]["rated_speed"] == "mps2_5"
    assert SOLVER.check(seeded["candidate"]["assignment"])


def test_register_names_requested_offered_and_status(seeded):
    entries = register(seeded)
    assert len(entries) == len(FIXTURE_B)
    deviations = [e for e in entries if e["status"] == "deviation"]
    assert len(deviations) == 1
    assert deviations[0]["variable"] == "rated_speed"
    assert deviations[0]["requested"] == "mps3_0"
    assert deviations[0]["offered"] == "mps2_5"
    assert deviations[0]["clause"] == "3.1"
    assert all(e["status"] == "met" for e in entries if e["variable"] != "rated_speed")


def test_register_of_an_unseeded_agreement_is_empty(empty):
    assert register(empty) == []


def test_ingest_demotes_unknown_codes_instead_of_dropping_them(empty):
    entries = FIXTURE_B + [
        {"variable": "budget", "value": "eur1800", "clause": "6.1", "quote": "cap"},
        {"variable": "rated_load", "value": "kg9999", "clause": "9.9", "quote": "bogus"},
    ]
    config, _, demoted = ingest(empty, entries, [])
    assert [u["clause"] for u in demoted] == ["6.1", "9.9"]
    assert "no product variable" in demoted[0]["note"]
    assert "is not a value of" in demoted[1]["note"]
    # nothing silently dropped: every demoted clause is listed as unmapped
    assert {u["clause"] for u in config["rfq"]["unmapped"]} == {"6.1", "9.9"}
    assert len(config["rfq"]["requirements"]) == len(FIXTURE_B)


def test_ingest_keeps_the_document_s_own_unmapped_clauses(empty):
    config, _, _ = ingest(empty, FIXTURE_B,
                          [{"clause": "6.3", "quote": "Possession of the shaft",
                            "note": "programme, not a product variable"}])
    assert config["rfq"]["unmapped"][0]["clause"] == "6.3"


def test_ingest_twice_is_rejected(seeded):
    with pytest.raises(ValueError, match="already seeded"):
        ingest(seeded, FIXTURE_B, [])


def test_ingest_rejects_an_already_configured_agreement(empty):
    config, _ = apply_choices(empty, {"building_type": "hotel"}, "user")
    with pytest.raises(ValueError, match="already has recorded choices"):
        ingest(config, FIXTURE_B, [])


def test_ingest_maps_nothing_is_rejected(empty):
    with pytest.raises(ValueError, match="maps to a product variable"):
        ingest(empty, [{"variable": "budget", "value": "x", "clause": "6.1",
                        "quote": "cap"}], [])


def test_failed_ingest_leaves_no_partial_state(empty):
    before = json.loads(json.dumps(empty))
    with pytest.raises(ValueError):
        ingest(empty, [{"variable": "nope", "value": "x", "clause": "1", "quote": "q"}], [])
    assert empty == before


def test_accept_waives_the_requirement_and_pins_the_offered_value(seeded):
    config, _, applied = reconcile(seeded, "rated_speed", "accept")
    assert applied == "mps2_5"
    # pinned as the customer's own choice, so a later revision cannot move it
    # silently — but the requirement stays listed, never forgotten
    assert config["choices"]["rated_speed"] == {"value": "mps2_5", "source": "user"}
    entry = next(e for e in register(config) if e["variable"] == "rated_speed")
    assert entry["status"] == "waived"
    assert entry["requested"] == "mps3_0"


def test_accept_needs_something_offered(empty):
    config, _, _ = ingest(empty, [FIXTURE_B[0]], [])
    with pytest.raises(ValueError, match="already meets the document"):
        reconcile(config, "building_type", "accept")


def test_revise_marks_the_requirement_and_moves_the_agreement(seeded):
    """Adjusting a requirement moves the agreement, never the document: the
    register still shows what clause 5.2 asked for."""
    config, _, applied = reconcile(seeded, "service_level", "revise", "standard")
    assert applied == "standard"
    assert config["choices"]["service_level"] == {"value": "standard", "source": "user"}
    entry = next(e for e in register(config) if e["variable"] == "service_level")
    assert entry["status"] == "revised"
    assert entry["requested"] == "premium"  # the document is frozen
    assert entry["offered"] == "standard"


def test_revising_back_onto_the_document_reads_as_met(empty):
    """The register is the diff, not a history of moves: an agreement that
    lands on the document's value complies, whatever happened on the way."""
    config, _, _ = ingest(empty, FIXTURE_B[:6], [])
    config, _, _ = reconcile(config, "usage_profile", "revise", "medium")
    assert next(e for e in register(config)
                if e["variable"] == "usage_profile")["status"] == "revised"
    config, _, _ = reconcile(config, "usage_profile", "revise", "heavy")
    assert next(e for e in register(config)
                if e["variable"] == "usage_profile")["status"] == "met"


def test_revise_that_collides_raises_for_the_repair_flow(seeded):
    """Insisting on the document's own figure collides with the modernization
    the document also states — so the customer meets the repair flow, and a
    new deviation is never created silently."""
    config, _, _ = reconcile(seeded, "rated_speed", "accept")
    with pytest.raises(ConflictError):
        reconcile(config, "rated_speed", "revise", "mps3_0")
    # rejected transitions leave the agreement and the marks untouched
    assert config["choices"]["rated_speed"]["value"] == "mps2_5"
    assert next(e for e in register(config)
                if e["variable"] == "rated_speed")["status"] == "waived"


def test_open_puts_a_reconciled_requirement_back(seeded):
    config, _, _ = reconcile(seeded, "rated_speed", "accept")
    config, _, applied = reconcile(config, "rated_speed", "open")
    assert applied is None
    assert next(e for e in register(config)
                if e["variable"] == "rated_speed")["status"] == "deviation"


def test_reconcile_moves_every_clause_on_one_variable_together(empty):
    """Three clauses bearing on service level are one disagreement, answered
    once — that is how a tender reads."""
    entries = [
        {"variable": "installation", "value": "modernization", "clause": "1.2", "quote": "a"},
        {"variable": "rated_speed", "value": "mps3_0", "clause": "3.1", "quote": "b"},
        {"variable": "service_level", "value": "premium", "clause": "4.1", "quote": "24/7"},
        {"variable": "service_level", "value": "premium", "clause": "4.2", "quote": "8 h"},
        {"variable": "service_level", "value": "premium", "clause": "4.3", "quote": "99.5 %"},
    ]
    config, _, _ = ingest(empty, entries, [])
    config, _, _ = reconcile(config, "service_level", "revise", "standard")
    marks = [e["status"] for e in register(config) if e["variable"] == "service_level"]
    assert marks == ["revised", "revised", "revised"]


def test_duplicate_clauses_do_not_outvote_a_single_one(empty):
    """Fewest deviations counts distinct requested values, not clauses —
    otherwise a term a document repeats three times would drag the whole
    seeding toward it."""
    entries = [
        {"variable": "installation", "value": "modernization", "clause": "1.2", "quote": "a"},
        {"variable": "rated_speed", "value": "mps3_0", "clause": "3.1", "quote": "b"},
        {"variable": "rated_speed", "value": "mps3_0", "clause": "3.2", "quote": "c"},
        {"variable": "rated_speed", "value": "mps3_0", "clause": "3.3", "quote": "d"},
    ]
    config, seeded_result, _ = ingest(empty, entries, [])
    assert len(seeded_result.deviations) == 1
    assert config["choices"]["installation"]["value"] == "modernization"


def test_the_frozen_reference_survives_every_later_transition(seeded):
    """Reconciliation and revision move the agreement; the document does not
    move. Deleting a conversation loses nothing but the argument."""
    immutable = [{k: v for k, v in r.items() if k != "reconciliation"}
                 for r in seeded["rfq"]["requirements"]]
    config, _, _ = reconcile(seeded, "rated_speed", "accept")
    config, _ = apply_choices(config, {"wall_finish": "laminate"}, "user")
    config = make_candidate(config)
    config = withdraw_choices(config, ["stops"])
    config = make_candidate(config)

    assert [{k: v for k, v in r.items() if k != "reconciliation"}
            for r in config["rfq"]["requirements"]] == immutable
    # the marks survive too, and the register still derives against the document
    assert next(e for e in register(config)
                if e["variable"] == "rated_speed")["status"] == "waived"
    assert len(register(config)) == len(immutable)


def test_reconciling_an_unseeded_agreement_is_rejected(empty):
    with pytest.raises(ValueError, match="not seeded from a document"):
        reconcile(empty, "rated_speed", "open")


def test_reconciling_a_variable_the_document_is_silent_on(seeded):
    with pytest.raises(ValueError, match="states no requirement"):
        reconcile(seeded, "wall_finish", "open")


# -- undo (docs/specs/undo) -----------------------------------------------


def test_restore_returns_the_exact_prior_state(with_candidate):
    """Choices with their sources and the candidate all come back — not an
    approximation of them."""
    before = with_candidate
    snap = snapshot(before)
    moved, _ = revise(before, {"building_type": "office"}, [], "agent")
    moved = make_candidate(moved)
    assert moved["choices"]["building_type"] == {"value": "office", "source": "agent"}

    back = restore(snap)
    assert back["choices"] == before["choices"]
    assert back["candidate"] == before["candidate"]


def test_restore_re_derives_statuses_rather_than_keeping_them(with_candidate):
    """A snapshot has no statuses to copy — the solver recomputes them, which
    is what makes a restore a move and not a bypass."""
    snap = snapshot(with_candidate)
    assert "statuses" not in snap
    assert restore(snap)["statuses"] == with_candidate["statuses"]


def test_restore_refuses_a_value_the_model_no_longer_has(with_candidate):
    """The reachable failure once elevator.json is edited (constitution #2):
    the agreement stays as it was and the conflict is named."""
    snap = snapshot(with_candidate)
    snap["choices"]["building_type"] = {"value": "spaceport", "source": "user"}
    with pytest.raises(ValueError, match="unknown value"):
        restore(snap)


def test_restore_carries_the_reconciliation_marks_of_its_own_batch(seeded):
    """Marks move with a batch, so restoring them is most of what undoing a
    reconciliation means."""
    snap = snapshot(seeded)
    waived, _, _ = reconcile(seeded, "rated_speed", "accept")
    assert next(e for e in register(waived)
                if e["variable"] == "rated_speed")["status"] == "waived"

    back = restore(snap)
    assert next(e for e in register(back)
                if e["variable"] == "rated_speed")["status"] == "deviation"


def test_restore_drops_a_candidate_that_no_longer_extends_the_choices(with_candidate):
    """Only reachable through a hand-built snapshot, but the guard is the same
    one every other transition applies."""
    snap = snapshot(with_candidate)
    snap["choices"]["building_type"] = {"value": "office", "source": "user"}
    assert restore(snap)["candidate"] is None


def test_the_restoration_is_described_in_the_customer_s_terms(with_candidate):
    moved, _ = revise(with_candidate, {"building_type": "office"}, [], "agent")
    described = describe_restoration(moved, restore(snapshot(with_candidate)))
    assert "Office" in described and "Hotel" in described


def test_a_restored_fee_is_named(with_candidate):
    """The monthly figure moves with the batch, so the description says so."""
    moved, _ = revise(with_candidate, {"cop": "touch_premium"}, [], "user")
    assert moved["candidate"]["price"] != with_candidate["candidate"]["price"]
    described = describe_restoration(moved, restore(snapshot(with_candidate)))
    assert f"{with_candidate['candidate']['price']} EUR/month" in described

    unpriced, _ = apply_choices(empty_configuration(), {"building_type": "hotel"}, "user")
    described = describe_restoration(with_candidate, restore(snapshot(unpriced)))
    assert "no priced candidate" in described
