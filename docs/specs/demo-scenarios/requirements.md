# Demo scenarios: scripted walkthroughs as definition of done

Status: draft — awaiting approval.

The prototype's closing feature (the last step of the original research outline; the scenarios are the direction's worked examples, [docs/discovery/direction.md](../../discovery/direction.md) §4): four scripted walkthroughs that exercise every research claim. They serve two audiences at once — a presenter who needs a repeatable demo, and the repo itself, which needs an executable definition of done that fails when a change breaks a demonstrated behavior.

## Stories

- As the researcher presenting this prototype, I have a walkthrough document per scenario — what to type or click, what to point at on screen, what must happen — so any demo run is repeatable and I never improvise past a broken step.
- As a developer changing the model, solver, or agent, I can run the scenarios as automated checks and learn immediately when a demonstrated behavior regressed — without eyeballing four manual demos.
- As a skeptical audience member, each scenario maps to a named research claim (articulation barrier, revision with repair, parallel candidates, renewal as revision), so the demo is an argument, not a tour.

## The four scenarios

1. *Needs, not nomenclature* (articulation barrier; constitution #4, #5): a hospital customer speaks only in building terms — beds, wards, floors. The agent translates needs into choices, announces the forced cascade (bed-sized car, accessibility), offers in-chat controls, and produces a priced valid candidate. Along the way the customer overrides one agent-picked value (a finish) in a single turn — who chose what stays visible throughout, serving [the agent proposes; the user disposes](../../discovery/principles/agent-proposes-user-disposes.md). The customer never types a part code.
2. *Revision with repair* (constitution #7, #6): the modernization scenario — 1.6 m/s recorded, customer asks for 3.0 m/s. Solver-computed repair options appear as cards with ripple and rule labels; picking one applies atomically; abandoning changes nothing.
3. *Parallel candidates* (constitution #7): save "the practical one", explore a premium direction, compare side by side with the price delta — and, once the [environmental-footprint spec](../environmental-footprint/requirements.md) lands, the footprint delta held beside it, serving [trade-offs shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md) — adopt one; the other stays available.
4. *Renewal as revision* (constitution #7): reopen yesterday's thread — spec sheet, cards, and frames restore exactly; "where were we?" is answered from state without re-eliciting. Then the renewal opens through an unusual door: the customer's first substantive turn is a bare dimension statement ("the shaft is 1800 by 1700"), not a canvas control or a pending question, and the change lands on the right variable with its ripple handled as in scenario 2 — deliberately exercising [any door is an entrance](../../discovery/principles/any-door-is-an-entrance.md).

## Acceptance criteria

- GIVEN the demo document, WHEN a presenter follows any scenario step by step in the running app, THEN every step names the exact input (message to type, control to click) and the observable outcome (canvas state, card, price), and the run reaches the scenario's end state without improvisation.
- GIVEN the automated harness, WHEN a scenario runs against the real agent graph, THEN assertions target solver-backed outcomes — recorded choices, forced values, candidate validity, payload kinds, frame contents — never the LLM's prose, so runs survive wording variation.
- GIVEN a state-critical step (a commitment, a repair application, an adoption), WHEN the harness dispatches it, THEN it uses the same structured message grammar as the UI cards and canvas ("Set … (var=value)", "Apply repair: …", 'Adopt frame "…"'), keeping one validated path and making the step deterministic.
- GIVEN scenario 1, WHEN it completes, THEN no user turn contained a variable name or option code, the final candidate is solver-valid with the hospital cascade (bed car, accessibility) present, every recorded choice carries its source (`user` for stated needs, `agent` for derived values), and the customer's override of one agent-picked value took a single turn and changed nothing else.
- GIVEN scenario 2, WHEN the revision is requested, THEN a repairs payload is produced whose top option drops modernization with the pit/headroom ripple attached; applying it yields exactly the repaired choice set; the abandon path leaves state untouched.
- GIVEN scenario 3, WHEN it completes, THEN two frames existed concurrently, the comparison payload listed only differing variables with a correct price delta, and adoption replaced the choice set atomically while the other frame survived.
- GIVEN scenario 3 after the [environmental-footprint spec](../environmental-footprint/requirements.md) is implemented, WHEN the comparison payload is produced, THEN it holds the footprint delta beside the price delta, never combined into a single score. (Deferred: footprint is a draft spec; the harness gains this assertion in the change that lands it — until then the pair claim rests on the price half only.)
- GIVEN scenario 4, WHEN a new session reloads the scenario's thread, THEN restored choices, statuses, and frames equal the pre-interruption state, and the what's-left answer derives from get_configuration.
- GIVEN scenario 4's restored thread, WHEN the customer's next turn is the bare dimension statement "the shaft is 1800 by 1700" (no canvas control, no pending question), THEN it is recorded as a user-sourced choice on the shaft variable — with repairs offered as in scenario 2 if it conflicts — and no already-settled variable is re-elicited.
- GIVEN a product-model change that alters a value or price a scenario references, WHEN the harness runs, THEN the affected scenario fails rather than drifting silently (scripts assert against the live model, not hardcoded copies of it).
- The harness runs via an explicit pytest marker, is skipped cleanly when OPENAI_API_KEY is absent, and does not run as part of the default `uv run pytest`.

## Out of scope

Browser automation of the demos (the harness drives the agent graph; on-screen behavior was verified per-feature when the canvas and nonlinear interaction landed, and remains a presenter concern); performance or load evaluation; formal user studies; scenario recordings/videos; CI wiring for the LLM-dependent harness.
