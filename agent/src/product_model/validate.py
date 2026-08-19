"""
Validate the elevator product model (docs/specs/product-model).

Uses the solver service; checks:
  1. The model is satisfiable at all.
  2. No dead options: every value of every variable appears in at least
     one complete valid configuration.
  3. Scenario spot-checks: intended forcings hold and intended conflicts
     are UNSAT with a sensible explanation.
  4. Pricing sanity.
  5. Footprint (docs/specs/environmental-footprint): energy-class
     determinacy, the R35 coupling, the evidence-mandated energy-table
     shapes (standby inversion, conditional regeneration, class
     monotonicity), and embodied calibration against the EPD anchor.

Run from agent/:  uv run python src/product_model/validate.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.solver import ConfigSolver, load_model

MODEL_PATH = Path(__file__).parent / "elevator.json"


def scenario(solver, title, choices, expect):
    result = "sat" if solver.check(choices) else "unsat"
    ok = result == expect
    print(f"  [{'ok' if ok else 'FAIL'}] {title}: expected {expect}, got {result}")
    if result == "unsat":
        conflict = solver.explain(choices)
        print(f"        explanation: {conflict.describe(solver.model)}")
    return ok


def check_statuses(solver, title, choices, var, expect):
    """Check per-value statuses of one variable under `choices`; `expect` maps
    value -> expected status ("forced", "invalid", or "available" for neither)."""
    live = solver.valid_options(choices)[var]
    got = {v: live[v] if live[v] in ("forced", "invalid") else "available" for v in expect}
    ok = got == expect
    print(f"  [{'ok' if ok else 'FAIL'}] {title}: {got}")
    return ok


def main():
    model = load_model(MODEL_PATH)
    solver = ConfigSolver(model)

    n_opts = sum(len(v.options) for v in model.variables.values())
    print(f"Model: {len(model.variables)} variables, {n_opts} option values, "
          f"{len(model.constraints)} constraints")

    print("1. Global satisfiability:", end=" ")
    if not solver.check({}):
        print("UNSAT — model is broken")
        sys.exit(1)
    print("sat")

    print("2. Dead option check:")
    options = solver.valid_options({})
    dead = [
        f"{var}={val}"
        for var, statuses in options.items()
        for val, s in statuses.items() if s == "invalid"
    ]
    if dead:
        print("  DEAD OPTIONS:", ", ".join(dead))
    else:
        print("  none — every option value is reachable")

    print("3. Scenarios:")
    failures = 0

    failures += not scenario(
        solver, "Hospital, EU, 2000 kg — valid",
        {"building_type": "hospital", "region": "europe", "rated_load": "kg2000"}, "sat")

    car_statuses = solver.valid_options(
        {"building_type": "hospital", "rated_load": "kg2000"})["car_size"]
    cars = [v for v, s in car_statuses.items() if s != "invalid"]
    ok = cars == ["c1500x2700"] and car_statuses["c1500x2700"] == "forced"
    print(f"  [{'ok' if ok else 'FAIL'}] Hospital + 2000 kg forces bed car: {cars}")
    failures += not ok

    failures += not scenario(
        solver, "Modernization + 3.0 m/s (pit cannot be deepened) — conflict",
        {"installation": "modernization", "rated_speed": "mps3_0"}, "unsat")

    failures += not scenario(
        solver, "Glass doors in a 40 m office (fire rating required) — conflict",
        {"building_type": "office", "travel": "high_30_50", "door_finish": "glass"}, "unsat")

    failures += not scenario(
        solver, "ADA + premium touchscreen panel — conflict",
        {"accessibility": "ada", "cop": "touch_premium"}, "unsat")

    failures += not scenario(
        solver, "Residential EU, 630 kg, glass doors, low rise — valid",
        {"building_type": "residential", "region": "europe",
         "rated_load": "kg630", "door_finish": "glass", "travel": "low_0_15"}, "sat")

    failures += not scenario(
        solver, "Tower hotel: 90 m, 2.5 m/s, 1600 kg — valid",
        {"building_type": "hotel", "travel": "tower_75_100",
         "rated_speed": "mps2_5", "rated_load": "kg1600"}, "sat")

    # Agreement couplings (docs/specs/service-agreement)
    conn = solver.valid_options({"service_level": "premium"})["connectivity_package"]
    ok = conn["connected"] == "forced" and conn["none"] == "invalid"
    print(f"  [{'ok' if ok else 'FAIL'}] Premium service forces the connectivity package (R31)")
    failures += not ok

    failures += not scenario(
        solver, "Heavy usage + hydraulic drive (duty cycle) — conflict",
        {"usage_profile": "heavy", "drive": "hydraulic"}, "unsat")

    failures += not scenario(
        solver, "Hospital + basic service level — conflict",
        {"building_type": "hospital", "service_level": "basic"}, "unsat")

    # Negotiable equipment (R41–R53)
    tall_eu_office = {"region": "europe", "building_type": "office", "travel": "high_30_50"}
    failures += not check_statuses(
        solver, "A tall European office forces the firefighters lift (R47)",
        tall_eu_office, "firefighters_operation",
        {"en81_72": "forced", "recall": "invalid", "none": "invalid"})
    failures += not check_statuses(
        solver, "…which forces fire-rated doors (R48) and battery backup (R49)",
        tall_eu_office, "rescue_operation",
        {"ups": "forced", "ard": "invalid", "manual": "invalid"})
    failures += not check_statuses(
        solver, "…and leaves no unrated landing door (R24/R48)",
        tall_eu_office, "fire_rating", {"none": "invalid"})

    failures += not check_statuses(
        solver, "North America has recall and nothing else (R46)",
        {"region": "north_america"}, "firefighters_operation",
        {"recall": "forced", "en81_72": "invalid", "none": "invalid"})
    failures += not check_statuses(
        solver, "Europe has the EN 81-72 lift as the upgrade (R46)",
        {"region": "europe"}, "firefighters_operation",
        {"recall": "invalid", "en81_72": "available", "none": "available"})

    failures += not check_statuses(
        solver, "A machine-room-less lift cannot be hand-wound (R43)",
        {"drive": "gearless_mrl"}, "rescue_operation", {"manual": "invalid"})

    failures += not check_statuses(
        solver, "Destination control forces the connected package (R41)",
        {"dispatch_control": "destination"}, "connectivity_package",
        {"connected": "forced", "none": "invalid"})
    failures += not check_statuses(
        solver, "Destination control rules out the small stop bands (R42)",
        {"dispatch_control": "destination"}, "stops", {"s2_6": "invalid"})

    failures += not scenario(
        solver, "Ten-week handover + panoramic glass wall — conflict",
        {"lead_time": "expedited", "wall_finish": "glass_panoramic"}, "unsat")

    failures += not check_statuses(
        solver, "A hotel locks its guest floors (R51)",
        {"building_type": "hotel"}, "access_control", {"none": "invalid"})

    print("4. Pricing sanity (longest term yields the lowest monthly):")
    choices = {"building_type": "office", "travel": "mid_15_30", "usage_profile": "medium"}
    monthlies = []
    for term in solver.model.variable("contract_term").values:
        _, monthly = solver.complete({**choices, "contract_term": term})
        monthlies.append(monthly)
        print(f"     {term}: {monthly} EUR/month")
    ok = monthlies == sorted(monthlies, reverse=True)
    print(f"  [{'ok' if ok else 'FAIL'}] monthly fee decreases with term length")
    failures += not ok

    print("5. Footprint (docs/specs/environmental-footprint):")

    # Determinacy: every feasible (drive, energy package) pair forces exactly
    # one energy class — R36–R40 are checked, not trusted.
    for drv in model.variable("drive").values:
        for ep in model.variable("energy_package").values:
            if not solver.check({"drive": drv, "energy_package": ep}):
                continue
            statuses = solver.valid_options({"drive": drv, "energy_package": ep})["energy_class"]
            live = [v for v, s in statuses.items() if s != "invalid"]
            ok = len(live) == 1 and statuses[live[0]] == "forced"
            print(f"  [{'ok' if ok else 'FAIL'}] {drv} + {ep} forces exactly one class: {live}")
            failures += not ok

    failures += not scenario(
        solver, "Regenerative drive on the hydraulic platform — conflict",
        {"platform": "hydro_s300", "energy_package": "regen"}, "unsat")
    conflict = solver.explain({"platform": "hydro_s300", "energy_package": "regen"})
    ok = conflict is not None and "R35" in {rid for rid, _ in conflict.rules}
    print(f"  [{'ok' if ok else 'FAIL'}] the explanation names R35")
    failures += not ok

    kwh = model.footprint_block.annual_kwh
    travel_bands = model.variable("travel").values
    usages = model.variable("usage_profile").values  # low → heavy in model order

    def saving(hi: str, lo: str, usage: str, travel: str) -> float:
        return (kwh[hi][usage][travel] - kwh[lo][usage][travel]) / kwh[hi][usage][travel]

    # Standby inversion: the eco step (D→C hydraulic, C→B gearless) saves
    # proportionally more at low usage than at heavy, in every travel band.
    ok = all(
        saving(hi, lo, "low", t) > saving(hi, lo, "heavy", t)
        for t in travel_bands for hi, lo in (("d", "c"), ("c", "b"))
    )
    print(f"  [{'ok' if ok else 'FAIL'}] standby inversion: eco saves proportionally more at low usage")
    failures += not ok

    # Conditional regeneration: the regen step (B→A) saves strictly more with
    # each usage step and each travel band.
    by_usage = all(
        saving("b", "a", usages[i], t) < saving("b", "a", usages[i + 1], t)
        for t in travel_bands for i in range(len(usages) - 1)
    )
    by_travel = all(
        saving("b", "a", u, travel_bands[i]) < saving("b", "a", u, travel_bands[i + 1])
        for u in usages for i in range(len(travel_bands) - 1)
    )
    ok = by_usage and by_travel
    print(f"  [{'ok' if ok else 'FAIL'}] conditional regeneration: saving grows with usage and travel")
    failures += not ok

    ok = all(
        kwh["a"][u][t] <= kwh["b"][u][t] <= kwh["c"][u][t] <= kwh["d"][u][t]
        for u in usages for t in travel_bands
    )
    print(f"  [{'ok' if ok else 'FAIL'}] class monotonicity: A ≤ B ≤ C ≤ D in every cell")
    failures += not ok

    # Calibration: the 630 kg / 12 m reference configuration reconciles to the
    # ~8.5 t A1–A3 EPD anchor (embodied-carbon.md §2) within ±25%.
    reference = {
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
    missing = set(model.variables) - set(reference)
    ok = not missing
    print(f"  [{'ok' if ok else 'FAIL'}] the reference configuration is complete"
          + (f" — missing {sorted(missing)}" if missing else ""))
    failures += not ok
    ok = solver.check(reference)
    print(f"  [{'ok' if ok else 'FAIL'}] reference configuration is valid")
    failures += not ok
    embodied = model.footprint(reference)["embodied"]
    anchor = 8500
    ok = abs(embodied - anchor) / anchor <= 0.25
    print(f"  [{'ok' if ok else 'FAIL'}] reference embodied {embodied} kg within ±25% of the {anchor} kg anchor")
    failures += not ok

    if dead or failures:
        print(f"\nvalidation FAILED ({len(dead)} dead options, {failures} scenario failures)")
        sys.exit(1)
    print("\nvalidation passed")


if __name__ == "__main__":
    main()
