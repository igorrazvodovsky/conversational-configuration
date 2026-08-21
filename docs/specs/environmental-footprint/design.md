# Environmental footprint — design

Rules the footprint dimension end to end: the `co2` field and `footprint` block in the model, the variables and rules it adds, the second solver objective, the arithmetic, and the frontend figures. Read it before changing a footprint number or the assumptions behind one; what may honestly be *said* about those numbers is ruled by [claims and vocabulary](../../research/footprint/claims-and-vocabulary.md).

Almost everything here is model data plus lookup arithmetic. The schema gains one option field, two variables, six rules and one data block. The solver gains a second objective, the tool surface gains one parameter and no new tools, and the frontend gains a header figure, an assumptions panel and a comparison delta. There are no new card kinds and no new state machinery.

## Model data: the `co2` field

Every option in `elevator.json` carries `co2`: integer kg CO₂e, cradle to gate (A1–A3), *before* the fabrication multiplier. Negatives are allowed, because PVC undercuts the rubber baseline, and impact-free options carry an explicit `0` — agreement variables, context, `energy_class`. The loader requires the field on every option whenever the model has a `footprint` block, the same enforcement point as the both-price-kinds rule, so the validator criterion is met by loading.

The authoring convention is that an option's `co2` is its component's absolute embodied contribution wherever the research derives one, so the assignment sum times the multiplier reconciles to the EPD anchors.

- `travel` carries rails, roping and travelling cable, about 1.3 t rising to about 8.5 t across the bands ([bottom-up embodied carbon](../../research/footprint/embodied-carbon.md), *Guide rails and travel height*), which makes it the dominant term.
- `stops` carries landing-door sets, at about 140 kg CO₂e per landing.
- `platform` carries the machine, car shell and counterweight base, calibrated last so a reference configuration at 630 kg and 12 m lands near the 8.5 t anchor after the multiplier (*The calibration step*). Under *Drive, counterweight and platform* the platforms are differentiated only by what load, travel and drive already imply.
- `car_size`, finishes, floors, doors and fire rating carry the mass-derived deltas of *Car finishes* and *Doors*, including the stainless-versus-glass hypothesis as stated, with stainless higher.
- `energy_package` gives eco about 0, and regenerative a small positive premium for drive electronics, so the trade-off of spending embodied carbon to save use-phase carbon is represented.

The door-finish delta is authored at the 5-stop reference rather than scaled by `stops`. That is a named simplification rather than an oversight: scaling it would need option-pair pricing the schema doesn't have, and the noise doesn't justify it.

## Model data: the `footprint` block

A top-level block, parallel to `pricing`, holds every assessment assumption from requirements decision 5 as named data:

```json
"footprint": {
  "service_life_years": 25,
  "operating_days": 365,
  "grid_factor": 0.22,
  "grid_factor_decarbonising": 0.11,
  "fabrication_multiplier": 1.9,
  "module_scope": "Embodied ≈ EN 15804 A1–A3 with a fabrication multiplier; use-phase ≈ B6. Installation, maintenance and end-of-life are not modelled.",
  "annual_kwh": { "<energy_class>": { "<usage_profile>": { "<travel>": kWh } } }
}
```

`annual_kwh` is keyed by energy class, usage profile and travel band: 4 × 3 × 5 entries. The travel key is the one refinement over the requirements' original class-by-usage table, and the requirements were amended to match. Without it, conditional regeneration can't have the shape decision 3 mandates, since regeneration recovers more the deeper the shaft. It is still a pure lookup, so the enum-only schema shape holds.

Values are derived offline from the Barney and Lorente simplified ISO 25745-2 formulas and sanity-anchored to the retrieved datapoints: residential UC1 at about 1.4 kWh/day, office UC5 at about 41.7 kWh/day, and Schindler UC4 at about 4,250 kWh/year ([how use-phase energy behaves](../../research/footprint/use-phase-energy.md), *Worked examples* and *Classification A–G*). The derivation isn't kept as code. The *shapes* the table has to reproduce are enforced by the validator, described under *Validation and tests*, which is the durable guarantee.

`grid_factor_decarbonising` is the RICS-style bookend from [the assessment assumptions](../../research/footprint/assumptions.md), *Grid emission factor*, shown in the assumptions panel as an alternative scenario and never as the headline.

## New variables and rules

Both new variables join the `platform` group after `drive`, because they are drive hardware, and canvas position falls out of data order as always.

- `energy_package` takes `standard`, `eco` (LED lighting, deep standby) or `regen` (a regenerative drive, which includes the eco measures). The packages are cumulative tiers, so the enum stays one-dimensional. It is priced on a cost basis like other hardware.
- `energy_class` takes `a` through `d`, with the label *"Energy class (modelled)"*, so the claims discipline is carried by the data itself. It is unpriced, carries `co2: 0`, and is fully determined, so it renders as a forced value.

Rules continue the R-series, with labels written as sayable sentences.

- *R35*: a regenerative drive requires a gearless traction machine, so `energy_package=regen` implies `drive ∈ {gearless_mrl, gearless_mr}`. This is the evidence-backed coupling from [how use-phase energy behaves](../../research/footprint/use-phase-energy.md), *Regenerative drives*.
- *R36–R40*: class determination, one implication per feasible drive-and-package pair. Hydraulic plus standard gives D, hydraulic plus eco gives C, gearless plus standard gives C, gearless plus eco gives B, and regen gives A, because R35 already made the drive gearless. Together they force exactly one class for every feasible combination, a determinacy property the validator checks rather than trusts.

To the solver these are ordinary enum variables, so `valid_options`, `explain`, `repairs`, drafts and the canvas work over them unchanged. A user asking for regen on the hydraulic platform gets an R35 unsat core like any other conflict.

## Solver: the `co2` objective

`complete(choices, objective)` accepts `"co2"` alongside `"price"`. Lifetime CO₂e is embodied plus use-phase.

- *Embodied* is separable per option: the existing If-sum pattern with weights of `co2 × fabrication_multiplier`, integer-scaled.
- *Use-phase* isn't separable, because it belongs to the class, usage and travel trio. It is encoded as one If-term per `annual_kwh` cell: `If(And(sel_class, sel_usage, sel_travel), kwh × service_life × grid_factor_grams, 0)` — 60 terms, trivial at this scale.

Per-term iteration is kept from the price objective, with lexicographic minimization inside each term's `Optimize`: co2 first, the monthly-fee objective second. CO₂e is term-independent, so the secondary objective is what makes the result deterministic. Across terms the best co2-and-monthly pair wins, with ties going to the shorter term. The call returns the assignment, and the caller derives monthly and footprint from the model as before.

*Rejected alternative:* a combined weighted objective, price plus a carbon price. It would require choosing a €/tCO₂e number, which is exactly the kind of silent discretionary judgment [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md) forbids. The two objectives stay separate, and the user holds the pair.

## Footprint arithmetic

In `model.py`, mirroring `monthly()`, `ProductModel.footprint(assignment)` returns embodied — the sum of `co2` times the multiplier — use-phase, from the `annual_kwh` lookup times service life times the grid factor, the decarbonising-bookend use-phase, and their total, all in integer kg. It is the single computation, and solver, tools and tool messages all call it. The frontend does *not* re-derive it, unlike `monthlyDelta`: money needed re-derivation for option deltas in editors, and footprint deliberately has no option-level display, so totals ride in agent state and the frontend only formats.

## State and tools

`Candidate` gains a `footprint` key of `{"embodied": kg, "use_phase": kg, "total": kg}`. `Frame` did too, until [parallel-drafts](../parallel-drafts/design.md) removed frames. States persisted before this feature lack it, handled `.get`-style and rendered as "—", the same policy as the capex-era price fields.

- `propose_completion(objective: "price" | "co2" = "price")` stores the candidate with its footprint, and the tool message names the objective, either "cheapest monthly completion" or "lowest-footprint completion". In the same call it also solves the *other* objective, and when the two assignments differ it appends one line giving how many variables differ and both deltas: "a lowest-footprint completion differs in 3 variables: −4.1 t CO₂e, +€120/month — offer to show the pair". This settles the first-proposal tension the requirements name. The default objective stays cheapest, and it is disclosed rather than silent, because the alternative is *always* computed and shown, so [trade-offs shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md) is satisfied at the moment of proposal rather than only on request. The cost is one extra Optimize solve per proposal, milliseconds at this scale.
- *Cheapest against greenest, side by side* needs no new tool: `propose_completion()`, then `fork_draft("Lowest footprint")`, then `propose_completion(objective="co2")`, then `compare_drafts("Lowest footprint")`. The drafts machinery is exactly this flow — `save_frame` and `compare_frames` until [parallel-drafts](../parallel-drafts/design.md), and the sequence moved onto the new names with it. Under [where guidance lives](../agent-tools/design.md), the four-step sequence is taught by the `propose_completion` docstring, and its conversational trigger — offer the pair when the customer signals footprint interest — by the system prompt.
- The comparison payload, `frame_comparison` and `draft_comparison` since [parallel-drafts](../parallel-drafts/design.md), gives each side its `footprint` breakdown and gains `footprintDelta`. The per-variable difference rows keep price deltas only: an option-level co2 column is the badge format decision 6 bans, and use-phase isn't attributable to single options at all, because it belongs to the class, usage and travel trio, which appear as difference rows themselves when they differ. The pair-level delta is the requirements' criterion, and the sanctioned format under the moral-licensing evidence.
- `describe_product` gives options their embodied kg, after the multiplier so quoted numbers reconcile with totals, and ends with an assessment-assumptions section rendered from the `footprint` block plus the illustrative-model sentence. That is what lets the agent answer "how much CO₂ does the panoramic glass wall add?" from model data (constitution #1), because stating an embodied delta on request in chat isn't a badge.
- `get_configuration` mentions the candidate's footprint alongside its monthly fee.

The tool surface is otherwise unchanged, as the requirements expect. `ask_choices` payloads carry no co2, and `energy_package` renders as chips under the existing heuristic with no changes.

## System prompt

The additions are coupled to card copy as always. Quote footprint only from tool results or `describe_product` data, and never estimate. Always say "modelled, under these assumptions", and never present the class as certified or style it as a label. Use comparative and conditional phrasing only, with the words "green", "eco-friendly" and "sustainable" prohibited. Surface the assumptions — service life, usage profile, grid factor, module scope — when asked what a number assumes. And offer the cheapest-and-greenest pair when the customer signals footprint interest. All of these are voice rules and stay in the prompt under [where guidance lives](../agent-tools/design.md), because they have to hold on turns where no tool is called, which is exactly when a figure would be invented.

## Frontend

- `configurator.ts` gains the `Footprint` type, `formatCO2()` turning kg into "12.4 t CO₂e", and the `footprint` block exported for the assumptions panel. No arithmetic.
- One lifetime total is quoted on two surfaces: the canvas formats it with `formatCO2`, and the agent's prose with `_format_co2` in `configuration.py`. The two agree on the rounding rule, tenths rounding half away from zero. They didn't at first, because Python's `:.1f` rounds half to even, and 1250 kg read as 1.2 t in chat beside 1.3 t on the sheet. Nothing can share the code across the two runtimes, so the rule is written down in both, and each cites the other.
- On the canvas, the consideration clause that closes the operative terms ([agreement-document](../agreement-document/design.md)) carries the candidate's lifetime total under the monthly figure: "≈ 14.2 t CO₂e over 25 years (modelled)". An assumptions disclosure in a popover shows the embodied and use-phase split, service life, the usage profile in effect, the grid factor with its decarbonising bookend figure, module scope, and the illustrative-model sentence, all read from the model JSON.
- `energy_class` renders as an ordinary forced row, and its "(modelled)" label does the work. There is no EU-label styling anywhere, and no co2 in row editors or ask-choices cards.
- `draft-comparison.tsx`, `frame-comparison.tsx` at the time, renders the footprint delta next to the price delta. A side without a stored footprint shows "—" at delta 0, the established fallback.

## Considered and deferred: green value ordering

The requirements ask for this to be settled before implementation, and it is settled: it *stays deferred.* Biasing solver search order toward low-carbon options remains a silent discretionary preference until the canvas can show provenance for it, and this feature adds no such provenance surface. The explicit `objective="co2"` completion covers the user-steered version of the same intent. Revisit only with a disclosed-provenance design.

## Notes from implementation

- The `annual_kwh` values were generated from a small offline model in the Barney and Lorente shape: daily energy is trips per day times effective travel per trip times a per-class running factor (D 3.0, C 2.6, B 2.0 Wh/m·trip, with A equal to B under regeneration), plus per-class standby power (D 150 W, C 75 W, B and A 40 W) times standing hours. The regeneration fraction is 0.10, plus 0.04 per travel band and 0.07 per usage step, peaking at 40%, inside the published 20–40% band. The derivation isn't in the repo, because the validator's shape checks are the durable guarantee, as designed.
- Calibration landed at 8,503 kg embodied for the 630 kg and 12 m reference, against an anchor of about 8,500, with `platform` values of 2,200–3,200 kg CO₂e, differentiated only mildly, per the recommendation under *Drive, counterweight and platform*. The second EPD anchor, about 21 t at 1,600 kg, is *not* reconciled — a 1,600 kg configuration models at roughly half that — and no validator check claims it.
- On the real model the two objectives disagree out of the box. An office, mid-travel, medium-usage completion differs in 6 variables, at −10.9 t CO₂e for +34 EUR/month, which is a usable demo pair even before the travel-band case.
- `energy_class` statuses are only forced once drive and energy package are known, and before that the variable renders as an open row like any other. The "(modelled)" label is in the variable's data, as designed.
- One addition beyond the draft: candidates also carry an optional `objective` key, `"price"` or `"co2"`. The canvas header subtitle names the candidate's objective ([agreement-document design](../agreement-document/design.md)), and with two objectives a hardcoded "cheapest completion" would mislabel a lowest-footprint candidate. It is absent on pre-footprint threads, which were always cheapest.
- Browser pass, 2026-08-13. The header figure, assumptions popover, teaser-then-pair flow, footprint row and double delta in the comparison card, resumption with the objective label, per-option embodied answers — glass wall 570 kg against travel band 4,940 kg, both exactly 1.9 times the model values — and the R35 refusal all behaved as specified, and agent vocabulary stayed comparative and modelled throughout. Two conversation-quality findings came out of it. The agent asserted the *direction* of the eco package's effect from intuition, backwards, which the number-only claims discipline didn't fence, so the system prompt also forbids un-tooled directional claims and asks the agent to compare completions and quote deltas instead. And gpt-5.4-mini sometimes records a hypothetical — "how much would X add?" — as a commitment through `set_choices`; that was observed once, corrected conversationally, and no fix has been identified that doesn't fight the canvas-edit grammar. A third observation, a new conversation inheriting the previous thread's choices, reproduces without this feature and belongs to [nonlinear-interaction](../nonlinear-interaction/design.md).

## Validation and tests

- Loader errors: a missing `co2` on any option when `footprint` is present, `annual_kwh` not covering the class, usage and travel domains exactly, and non-numeric factors.
- Validator checks, beyond the automatic satisfiability and dead-option coverage of the new variables:
  - *Determinacy.* Every feasible drive-and-package pair forces exactly one `energy_class`.
  - *Conflict scenario.* Regen plus the hydraulic platform is unsat, with R35 in the explanation.
  - *Standby inversion.* For every travel band, the eco-versus-standard relative saving is strictly greater at `low` usage than at `heavy`.
  - *Conditional regeneration.* The regen-versus-eco relative saving strictly increases with usage and with travel band, and class monotonicity holds, A ≤ B ≤ C ≤ D per cell.
  - *Calibration.* The reference configuration's embodied total lands within ±25% of the 8.5 t EPD anchor.

  These make the table-shape clauses of the acceptance criteria automated rather than eyeballed.
- pytest covers `objective="co2"` returning a valid minimal-footprint completion, cross-checked by brute force on sampled choice sets; the monthly tie-break; `footprint()` arithmetic including the bookend; comparison payload footprint deltas and the pre-footprint "—" fallback; the propose-teaser line; and the loader errors.
- Browser pass (constitution #9): the travel-band-against-finish demo case, where price and footprint disagree on evidence that survives the factor uncertainties; the eco package on a low-traffic residential unit against a busy office, narrating the inversion; the cheapest-and-greenest pair through the parallel-candidate machinery, frames then and drafts now; the assumptions panel and a "what does that assume?" chat probe; and a vocabulary spot-check of agent replies.
