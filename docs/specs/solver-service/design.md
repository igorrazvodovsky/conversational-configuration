# Solver service — design

## Shape

`agent/src/solver/` package:

- `model.py` — load and validate a product-model JSON file into typed structures; per the [service-agreement spec](../service-agreement/design.md) it also parses `monthly_price` and the `pricing` block, and owns the monthly-fee arithmetic (`ProductModel.monthly`, `monthly_option_delta`) with half-up rounding mirrored by the frontend. Per the [environmental-footprint spec](../environmental-footprint/design.md) it parses `co2` and the `footprint` block (errors on missing `co2` or incomplete `annual_kwh` domain coverage) and owns the footprint arithmetic: `ProductModel.footprint(assignment)` returns embodied, use-phase, the decarbonising bookend and total in integer kg — the single footprint computation; the frontend never re-derives it.
- `service.py` — `ConfigSolver` class; one instance per model, holding a persistent `z3.Solver`.

## Encoding

One Bool per (variable, value) — `sel[var][val]` — with exactly-one constraints per variable, rather than the validator's Int encoding. Rationale: `Solver.consequences()` and unsat cores work over literals, and choice assumptions become single Bools.

## Operations

- `check(choices)` — `solver.check(assumptions)` where assumptions are the choices' `sel` literals. Incremental: learned clauses persist across calls.
- `valid_options(choices)` — one `Solver.consequences(assumptions, all_sel_literals)` call; a value is invalid iff its literal is a negative consequence, forced iff positive. Returns `{var: {value: "open" | "forced" | "invalid"}}` plus the chosen values.
- `explain(choices)` — on unsat, `unsat_core()` over choice literals, deletion-shrunk to a true MUS; each core element mapped back to (variable, value). Rule attribution: business rules are asserted via `assert_and_track` with their R-ids, so the core also yields the violated rule ids/labels.
- `complete(choices, objective="price")` — cheapest-*monthly* completion per the [service-agreement spec](../service-agreement/design.md): for each contract term not ruled out (one solve when the term is chosen), a `z3.Optimize` minimizes the linear objective Σ cost basis × financing_factor + months × Σ monthly_price (integer-scaled); the lowest monthly wins, ties to the shorter term. Returns full assignment + monthly fee (EUR/month). A separate Optimize instance per term per call (Optimize is not assumption-incremental); acceptable at this scale. `objective="co2"` ([environmental-footprint](../environmental-footprint/design.md)) minimizes lifetime CO₂e in grams instead — a separable embodied If-sum plus one If-term per `annual_kwh` cell over the (class, usage, travel) trio — lexicographically before the monthly objective, best (co2, monthly) across terms, ties to the shorter term.
- `repairs(choices, changes, limit=3)` (added by [nonlinear interaction](../nonlinear-interaction/design.md)) — the changes asserted hard, each existing choice a weight-1 soft constraint on a per-call `Optimize`; the first optimum is the max-retention repair, then a blocking clause (`Or` of the dropped literals) forces each next solution to retain something previously dropped, yielding distinct alternatives in non-increasing retention order. Each `Repair` carries dropped/kept/changes pairs, the forced ripple (via `valid_options` on the repaired set), and rule attribution (via `explain` on kept + changes + dropped, which is unsat by construction).
- `seed(requirements, limit=5)` (added by [rfq reconciliation](../rfq-reconciliation/design.md)) — the same soft-constraint machinery as `repairs()` with *nothing* held hard: every requested (variable, value) is a weight-1 soft constraint, so the optimum keeps as many as can hold together. Duplicate pairs are collapsed first — several clauses may cite one value, and counting it twice would distort the objective. Equal-count optima are enumerated with the same blocking loop and scored by their `complete()` price, cheapest winning; equal prices go to the lexicographically first dropped set, so the result never depends on Z3's enumeration order. Returns a `Seed` — kept pairs, the winning whole and its price, and one `Deviation` per unmet requirement carrying the offered value and the rules separating it (via `explain` on kept + that one).

## Testing

pytest in `agent/tests/test_solver.py` covering every acceptance criterion, including a property-style cross-check: `valid_options` output must agree with brute-force per-value `check` probes on a sample of choice sets. Add `pytest` as a uv dev dependency; run with `uv run pytest`.

## Notes from implementation

- Measured on the elevator model: `check` ~2.6 ms, `valid_options` (one `consequences()` call) ~3.2 ms — comfortably under the 100 ms target; no fallback needed.
- A conflict can have several independent minimal explanations (modernization + 3.0 m/s fails via pit *and* via headroom); `explain` returns one MUS, whichever Z3's core surfaces. Enumerating all MUSes is deferred until a feature needs it (the [nonlinear-interaction](../nonlinear-interaction/design.md) repairs did not).
- `Conflict.describe()` renders the explanation as a human-readable sentence using variable/option labels and rule labels — the string agent tools can pass straight to the LLM.
- `complete()` is not unique on variables that cost nothing: several wholes tie at the optimum and Z3 returns whichever it reaches, so two calls with identical choices can differ in, say, headroom. Prices are stable; assignments are not. A caller that must report a value it computed (`seed` reporting *offered*) has to store that assignment rather than re-solve for it. Making `complete` deterministic would need a tie-break over the whole assignment; no feature has needed one.
