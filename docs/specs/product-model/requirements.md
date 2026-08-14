# Mock elevator product model

Status: implemented (back-filled spec; this feature predates SDD adoption).

## Stories

- As the prototype developer, I need a declarative elevator product model realistic enough that configuration demos feel like real industrial CPQ, so the interaction research isn't dismissed as toy-domain.
- As the agent (downstream), I need every constraint to carry a human-readable label, so conflict explanations can cite real rules.
- As the optimizer (downstream), I need price data on options, so "cheapest valid completion" is demonstrable.
- As the specifier in a demo, I need the equipment a real elevator sale actually negotiates — how calls are dispatched, what happens in an entrapment, what the fire brigade uses, who may reach which floor, and when the lift is handed over — so the conversation has something to argue about besides finishes.

## Acceptance criteria

- GIVEN the model file, WHEN loaded, THEN it contains on the order of thirty decision variables with finite enum domains and fifty-odd named constraints, spanning context, performance, platform, dimensions, doors, cabin and safety groups.
- GIVEN the full constraint set, WHEN checked by the validator, THEN the model is satisfiable and *every option value of every variable* appears in at least one complete valid configuration (no dead options).
- GIVEN hospital + 2000 kg, WHEN remaining car sizes are computed, THEN only the 1500×2700 bed car remains (forced-value cascade).
- GIVEN modernization + 3.0 m/s, WHEN checked, THEN infeasible (existing pit cannot be deepened) — the revision-ripple demo case.
- GIVEN office + 30–50 m travel + glass doors, WHEN checked, THEN infeasible (fire rating requires non-glass).
- GIVEN ADA accessibility + touchscreen-only panel, WHEN checked, THEN infeasible.
- GIVEN a European office building with 30–50 m of travel, WHEN remaining values are computed, THEN the firefighters lift is forced, and it in turn forces fire-rated landing doors and full battery backup — one situational choice, a three-step cascade.
- GIVEN North America, WHEN remaining firefighters' operations are computed, THEN Phase I/II recall is the only one left; GIVEN Europe, THEN recall is unavailable and the EN 81-72 lift is the upgrade.
- GIVEN a machine-room-less drive, WHEN remaining rescue provisions are computed, THEN hand-winding is unavailable — there is no machine to wind.
- GIVEN destination control, WHEN checked, THEN it requires the connected package and at least seven stops, so a hardware choice reaches into the agreement's recurring fee.
- GIVEN expedited delivery + a panoramic glass car wall, WHEN checked, THEN infeasible — the handover date and the made-to-order finish trade against each other.
- GIVEN a hotel, WHEN remaining floor-access values are computed, THEN "none" is unavailable.
- Dimensional couplings follow EN 81-20's shape: load → car size, car size + door → shaft tier, speed → pit depth and headroom.
