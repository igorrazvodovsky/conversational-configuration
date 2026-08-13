# 002 — Interactive solver service

Status: implemented.

A Python module wrapping Z3 that turns the product model into the operations interactive configuration needs. Pure backend, no UI; consumed by agent tools in 003 (and revision repair in 005).

## Stories

- As the agent, I need to check a set of choices and get back either "valid" or a minimal, named explanation of the conflict, so I can tell the user *which of their choices* collide and *which rules* make them collide.
- As the agent, I need the remaining valid values for every undecided variable under the current choices, so the UI can grey out impossible options and I can auto-announce forced values.
- As the agent, I need a cheapest valid completion of a partial configuration, so I can always show a concrete priced candidate (constitution #5).
- As the agent, when a requested revision collides with recorded choices, I need solver-computed repair options — which existing choices to give up, ordered by how many are kept — so revision is productive, not just rejected (added by 005).
- As a developer extending the template, I need the service to load any model following the 001 schema, not just the elevator.

## Acceptance criteria

- GIVEN a partial choice set, WHEN `check` runs, THEN it returns satisfiable/unsatisfiable in under 100 ms.
- GIVEN modernization + 3.0 m/s, WHEN `explain` runs, THEN the result names the conflicting *user choices* and cites one complete rule chain by id and label — this case has two independent minimal explanations (pit: R03+R27, or headroom: R04+R28) and returning either is correct — and the conflict set over choices is minimal (removing any element makes it satisfiable).
- GIVEN hospital + 2000 kg, WHEN `valid_options` runs, THEN `car_size` reports only `c1500x2700` (and it is marked as forced), and every other variable's remaining values are consistent with a per-value SAT probe.
- GIVEN no choices at all, WHEN `valid_options` runs, THEN every variable reports its full domain (matches the 001 no-dead-options guarantee).
- GIVEN a partial choice set, WHEN `complete` runs with the price objective, THEN it returns a full valid configuration containing the given choices with the minimum total price, plus that price.
- GIVEN an unsatisfiable choice set, WHEN `valid_options` or `complete` runs, THEN it fails with a structured error carrying the `explain` result (no silent empty answers).
- GIVEN existing choices and a conflicting change, WHEN `repairs` runs, THEN it returns up to N repair options ordered by how many existing choices they keep, each with the dropped choices, the forced ripple of the repaired set, and the rules that made the dropped choices incompatible; a non-conflicting change returns no repairs, and infeasible changes fail with the structured conflict error (added by 005).
- All operations run against one persistent solver session per model (assumption-based, no model rebuild per call); `complete` and `repairs` use a per-call `Optimize` instance.

## Out of scope

Candidate frames/comparison (005 agent layer), enumerating every possible repair (top-N by retention suffices), agent tool wrappers (003).
