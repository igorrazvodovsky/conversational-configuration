# Solver service — design

Rules the Z3 service: its shape, the encoding, and the operations the rest of the system may ask for — `check`, `valid_options`, `explain`, `complete`, `repairs` and `seed`. Read it before changing solver behaviour or what a refusal is allowed to say.

## Shape

The `agent/src/solver/` package holds two modules.

- `model.py` loads and validates a product-model JSON file into typed structures. Under the [service-agreement spec](../service-agreement/design.md) it also parses `monthly_price` and the `pricing` block, and owns the monthly-fee arithmetic — `ProductModel.monthly` and `monthly_option_delta` — with half-up rounding mirrored by the frontend. Under the [environmental-footprint spec](../environmental-footprint/design.md) it parses `co2` and the `footprint` block, erroring on a missing `co2` or incomplete `annual_kwh` domain coverage, and owns the footprint arithmetic: `ProductModel.footprint(assignment)` returns embodied, use-phase, the decarbonising bookend and the total in integer kg. That is the single footprint computation, and the frontend never re-derives it.
- `service.py` holds the `ConfigSolver` class, one instance per model, holding a persistent `z3.Solver`.

## Encoding

One Bool per variable and value, `sel[var][val]`, with exactly-one constraints per variable, rather than the validator's Int encoding. `Solver.consequences()` and unsat cores work over literals, and choice assumptions become single Bools.

## Operations

- `check(choices)` calls `solver.check(assumptions)`, where the assumptions are the choices' `sel` literals. It is incremental, so learned clauses persist across calls.
- `valid_options(choices)` makes one `Solver.consequences(assumptions, all_sel_literals)` call. A value is invalid exactly when its literal is a negative consequence, and forced exactly when it is positive. It returns `{var: {value: "open" | "forced" | "invalid"}}` plus the chosen values.
- `explain(choices)` takes the `unsat_core()` over choice literals on unsat, deletion-shrunk to a true MUS, with each core element mapped back to a variable and value. For rule attribution, business rules are asserted through `assert_and_track` with their R-ids, so the core also yields the violated rule ids and labels.
- `complete(choices, objective="price")` finds the cheapest-*monthly* completion, per the [service-agreement spec](../service-agreement/design.md). For each contract term not ruled out — one solve when the term is chosen — a `z3.Optimize` minimizes the linear objective of the sum of cost basis times `financing_factor`, plus months times the sum of `monthly_price`, integer-scaled. The lowest monthly wins, with ties going to the shorter term, and the call returns the full assignment plus the monthly fee in EUR per month. There is a separate Optimize instance per term per call, because Optimize isn't assumption-incremental, which is acceptable at this scale.

  `objective="co2"` ([environmental-footprint](../environmental-footprint/design.md)) minimizes lifetime CO₂e in grams instead: a separable embodied If-sum plus one If-term per `annual_kwh` cell over the class, usage and travel trio, lexicographically ahead of the monthly objective. The best co2-and-monthly pair across terms wins, with ties going to the shorter term.

  An optional `prefer` assignment adds a weight-1 soft constraint per value *after* the objectives, so it breaks ties between equally optimal completions without ever buying a worse one. That is what keeps a reprice from flipping cost-free values the customer has already read ([agent-tools](../agent-tools/design.md)).
- `repairs(choices, changes, limit=3)`, added by [nonlinear interaction](../nonlinear-interaction/design.md), asserts the changes hard and makes each existing choice a weight-1 soft constraint on a per-call `Optimize`. The first optimum is the max-retention repair, and then a blocking clause, an `Or` of the dropped literals, forces each next solution to retain something previously dropped, yielding distinct alternatives in non-increasing retention order. Each `Repair` carries the dropped, kept and changed pairs, the forced ripple through `valid_options` on the repaired set, and rule attribution through `explain` on kept plus changes plus dropped, which is unsat by construction.
- `seed(requirements, limit=5)`, added by [RFQ reconciliation](../rfq-reconciliation/design.md), uses the same soft-constraint machinery as `repairs()` with *nothing* held hard: every requested variable-and-value pair is a weight-1 soft constraint, so the optimum keeps as many as can hold together. Duplicate pairs are collapsed first, because several clauses may cite one value and counting it twice would distort the objective. Equal-count optima are enumerated with the same blocking loop and scored by their `complete()` price, cheapest winning, and equal prices go to the lexicographically first dropped set, so the result never depends on Z3's enumeration order. It returns a `Seed`: the kept pairs, the winning whole and its price, and one `Deviation` per unmet requirement carrying the offered value and the rules separating it, through `explain` on kept plus that one.

## Testing

pytest in `agent/tests/test_solver.py` covers every acceptance criterion, including a property-style cross-check: `valid_options` output has to agree with brute-force per-value `check` probes on a sample of choice sets. `pytest` is a uv dev dependency, run with `uv run pytest`.

## Notes from implementation

- Measured on the elevator model, `check` takes about 2.6 ms and `valid_options`, one `consequences()` call, about 3.2 ms — comfortably under the 100 ms target, so no fallback was needed.
- A conflict can have several independent minimal explanations: modernization plus 3.0 m/s fails through the pit *and* through the headroom. `explain` returns one MUS, whichever Z3's core surfaces. Enumerating all MUSes is deferred until a feature needs it, and the [nonlinear-interaction](../nonlinear-interaction/design.md) repairs didn't.
- `Conflict.describe()` renders the explanation as a human-readable sentence using variable, option and rule labels, which is the string agent tools can pass straight to the LLM.
- `complete()` isn't unique on variables that cost nothing. Several wholes tie at the optimum and Z3 returns whichever it reaches, so two calls with identical choices can differ in, say, headroom. Prices are stable, and assignments aren't. A caller that has to report a value it computed — `seed` reporting *offered* — has to store that assignment rather than re-solve for it. Making `complete` deterministic would need a tie-break over the whole assignment, and no feature has needed one.
