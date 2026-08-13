# 001 — Mock elevator product model

Status: implemented (back-filled spec; this feature predates SDD adoption).

## Stories

- As the prototype developer, I need a declarative elevator product model realistic enough that configuration demos feel like real industrial CPQ, so the interaction research isn't dismissed as toy-domain.
- As the agent (downstream), I need every constraint to carry a human-readable label, so conflict explanations can cite real rules.
- As the optimizer (downstream), I need price data on options, so "cheapest valid completion" is demonstrable.

## Acceptance criteria

- GIVEN the model file, WHEN loaded, THEN it contains on the order of 20 decision variables with finite enum domains and 30+ named constraints, spanning context, performance, platform, dimensions, doors, and cabin groups.
- GIVEN the full constraint set, WHEN checked by the validator, THEN the model is satisfiable and *every option value of every variable* appears in at least one complete valid configuration (no dead options).
- GIVEN hospital + 2000 kg, WHEN remaining car sizes are computed, THEN only the 1500×2700 bed car remains (forced-value cascade).
- GIVEN modernization + 3.0 m/s, WHEN checked, THEN infeasible (existing pit cannot be deepened) — the revision-ripple demo case.
- GIVEN office + 30–50 m travel + glass doors, WHEN checked, THEN infeasible (fire rating requires non-glass).
- GIVEN ADA accessibility + touchscreen-only panel, WHEN checked, THEN infeasible.
- Dimensional couplings follow EN 81-20's shape: load → car size, car size + door → shaft tier, speed → pit depth and headroom.
