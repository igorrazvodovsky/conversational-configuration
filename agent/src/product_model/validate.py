"""
Validate the elevator product model (specs/001-product-model).

Uses the 002 solver service; checks:
  1. The model is satisfiable at all.
  2. No dead options: every value of every variable appears in at least
     one complete valid configuration.
  3. Scenario spot-checks: intended forcings hold and intended conflicts
     are UNSAT with a sensible explanation.

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

    if dead or failures:
        print(f"\nvalidation FAILED ({len(dead)} dead options, {failures} scenario failures)")
        sys.exit(1)
    print("\nvalidation passed")


if __name__ == "__main__":
    main()
