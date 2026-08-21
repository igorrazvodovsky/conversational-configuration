# Interactive solver service

Status: implemented.

A Python module wrapping Z3 that turns the product model into the operations interactive configuration needs. It is pure backend with no UI, consumed by [agent-tools](../agent-tools/requirements.md), and by revision repair in [nonlinear-interaction](../nonlinear-interaction/requirements.md).

## Stories

- As the agent, I need to check a set of choices and get back either "valid" or a minimal, named explanation of the conflict, so I can tell the user *which of their choices* collide and *which rules* make them collide.
- As the agent, I need the remaining valid values for every undecided variable under the current choices, so the UI can grey out impossible options and I can announce forced values automatically.
- As the agent, I need a cheapest valid completion of a partial configuration, so I can always show a concrete priced candidate (constitution #5).
- As the agent, when a requested revision collides with recorded choices, I need solver-computed repair options — which existing choices to give up, ordered by how many are kept — so revision is productive rather than merely rejected. Added by [nonlinear-interaction](../nonlinear-interaction/requirements.md).
- As a developer extending the template, I need the service to load any model following the [product-model schema](../product-model/design.md), not only the elevator.

## Acceptance criteria

- GIVEN a partial choice set, WHEN `check` runs, THEN it returns satisfiable or unsatisfiable in under 100 ms.
- GIVEN modernization and 3.0 m/s, WHEN `explain` runs, THEN the result names the conflicting *user choices* and cites one complete rule chain by id and label. This case has two independent minimal explanations — pit, R03 and R27, or headroom, R04 and R28 — and returning either is correct. The conflict set over choices is minimal, so removing any element makes it satisfiable.
- GIVEN hospital and 2000 kg, WHEN `valid_options` runs, THEN `car_size` reports only `c1500x2700`, marked as forced, and every other variable's remaining values are consistent with a per-value SAT probe.
- GIVEN no choices at all, WHEN `valid_options` runs, THEN every variable reports its full domain, matching the product model's no-dead-options guarantee.
- GIVEN a partial choice set, WHEN `complete` runs with the price objective, THEN it returns a full valid configuration containing the given choices with the minimum total price, plus that price.
- GIVEN an unsatisfiable choice set, WHEN `valid_options` or `complete` runs, THEN it fails with a structured error carrying the `explain` result, and never with a silent empty answer.
- GIVEN existing choices and a conflicting change, WHEN `repairs` runs, THEN it returns up to N repair options ordered by how many existing choices they keep, each with the dropped choices, the forced ripple of the repaired set, and the rules that made the dropped choices incompatible. A non-conflicting change returns no repairs, and infeasible changes fail with the structured conflict error. Added by [nonlinear-interaction](../nonlinear-interaction/requirements.md).
- All operations run against one persistent solver session per model, assumption-based and with no model rebuild per call. `complete` and `repairs` use a per-call `Optimize` instance.

## Out of scope

Parallel candidates and their comparison, which belong to the [nonlinear-interaction](../nonlinear-interaction/requirements.md) and [parallel-drafts](../parallel-drafts/requirements.md) agent layers. Enumerating every possible repair, where the top N by retention suffices. And agent tool wrappers ([agent-tools](../agent-tools/requirements.md)).
