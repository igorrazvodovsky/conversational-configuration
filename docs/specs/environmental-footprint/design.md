# Environmental footprint — design

Almost everything here is model data plus lookup arithmetic. The schema gains one option field, two variables, six rules and one data block; the solver gains a second objective; the tool surface gains one parameter and no new tools; the frontend gains a header figure, an assumptions panel and a comparison delta. No new card kinds, no new state machinery.

## Model data: the `co2` field

Every option in `elevator.json` carries `co2` — integer kg CO₂e, cradle-to-gate (A1–A3), *before* the fabrication multiplier, negative allowed (PVC undercuts the rubber baseline), explicit `0` on impact-free options (agreement variables, context, `energy_class`). The loader requires the field on every option whenever the model has a `footprint` block — same enforcement point as the both-price-kinds rule, so the validator criterion is met by loading.

Authoring convention: an option's `co2` is its component's absolute embodied contribution where the research derives one, so the assignment sum × multiplier reconciles to the EPD anchors:

- `travel` carries rails, roping, travelling cable (~1.3 t → ~8.5 t across the bands, [embodied-carbon.md](../../research/footprint/embodied-carbon.md) §5) — the dominant term.
- `stops` carries landing-door sets (~140 kg CO₂e per landing).
- `platform` carries the machine, car shell and counterweight base, calibrated last so a reference configuration (630 kg / 12 m) lands near the ~8.5 t anchor after the multiplier (§2). Per §6 the platforms are differentiated only by what load, travel and drive already imply.
- `car_size`, finishes, floors, doors, fire rating carry the §3–§4 mass-derived deltas — including the stainless-vs-glass hypothesis as stated (stainless higher).
- `energy_package`: eco ≈ 0, regenerative a small positive premium (drive electronics), so the trade-off of spending embodied carbon to save use-phase carbon is represented.

The door-finish delta is authored at the 5-stop reference rather than scaled by `stops` — a named simplification rather than an oversight; scaling it would need option-pair pricing the schema doesn't have and the noise doesn't justify.

## Model data: the `footprint` block

A top-level block, parallel to `pricing`, holding every assessment assumption from requirements decision 5 as named data:

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

`annual_kwh` is keyed by *(energy class, usage profile, travel band)* — 4 × 3 × 5 entries. The travel key is the one refinement over the requirements' original (class × usage) table (requirements amended to match): without it, conditional regeneration cannot have the shape decision 3 mandates, since regeneration recovers more the deeper the shaft. Still a pure lookup — no arithmetic constraints, the enum-only schema shape holds.

Values are derived offline from the Barney & Lorente simplified ISO 25745-2 formulas and sanity-anchored to the retrieved datapoints (residential UC1 ≈ 1.4 kWh/day, office UC5 ≈ 41.7 kWh/day, Schindler UC4 ≈ 4,250 kWh/year — [use-phase-energy.md](../../research/footprint/use-phase-energy.md) §4–§5). The derivation is not kept as code; the *shapes* the table must reproduce are enforced by the validator (below), which is the durable guarantee.

`grid_factor_decarbonising` is the RICS-style bookend from [assumptions.md](../../research/footprint/assumptions.md) §2: shown in the assumptions panel as an alternative scenario, never the headline.

## New variables and rules

Both new variables join the `platform` group after `drive` (they are drive hardware; canvas position falls out of data order as always):

- `energy_package` — `standard` / `eco` (LED lighting, deep standby) / `regen` (regenerative drive, includes the eco measures — the packages are cumulative tiers, so the enum stays one-dimensional). Priced as cost basis like other hardware.
- `energy_class` — `a`–`d`, label *"Energy class (modelled)"* so the claims discipline is carried by the data itself. Unpriced, `co2: 0`; fully determined, so it renders as a forced value.

Rules continue the R-series, labels written as sayable sentences:

- *R35* — regenerative drive requires a gearless traction machine (`energy_package=regen` → `drive ∈ {gearless_mrl, gearless_mr}`), the evidence-backed coupling from [use-phase-energy.md](../../research/footprint/use-phase-energy.md) §6.
- *R36–R40* — class determination, one implication per feasible (drive, energy package) pair: hydraulic + standard → D, hydraulic + eco → C, gearless + standard → C, gearless + eco → B, regen → A (drive already gearless via R35). Together they force exactly one class for every feasible combination — a determinacy property the validator checks rather than trusts.

To the solver these are ordinary enum variables; `valid_options`, `explain`, `repairs`, drafts and the canvas work over them unchanged. A user asking for regen on the hydraulic platform gets an R35 unsat core like any other conflict.

## Solver: the `co2` objective

`complete(choices, objective)` accepts `"co2"` alongside `"price"`. Lifetime CO₂e = embodied + use-phase:

- *Embodied* is separable per option — the existing If-sum pattern with weights `co2 × fabrication_multiplier`, integer-scaled.
- *Use-phase* is not separable — it belongs to the (class, usage, travel) trio. Encoded as one If-term per `annual_kwh` cell: `If(And(sel_class, sel_usage, sel_travel), kwh × service_life × grid_factor_grams, 0)` — 60 terms, trivial at this scale.

Per-term iteration is kept from the price objective, with lexicographic minimization inside each term's `Optimize`: co2 first, the monthly-fee objective second. CO₂e is term-independent, so the secondary objective is what makes the result deterministic; across terms the best (co2, monthly) wins, ties to the shorter term. Returns the assignment; the caller derives monthly and footprint from the model as before.

*Rejected alternative:* a combined weighted objective (price + carbon price). It would require choosing a €/tCO₂e number, which is exactly the kind of silent discretionary judgment [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md) forbids — the two objectives stay separate and the user holds the pair.

## Footprint arithmetic

In `model.py`, mirroring `monthly()`: `ProductModel.footprint(assignment)` returns embodied (Σ co2 × multiplier), use-phase (annual_kwh lookup × service life × grid factor), the decarbonising-bookend use-phase, and their total, all in integer kg. It is the single computation; solver, tools and tool messages all call it. The frontend does *not* re-derive it (unlike `monthlyDelta`): money needed re-derivation for option deltas in editors, and footprint deliberately has no option-level display — totals ride in agent state and the frontend only formats.

## State and tools

`Candidate` gains a `footprint` key: `{"embodied": kg, "use_phase": kg, "total": kg}` (`Frame` did too, until [parallel-drafts](../parallel-drafts/design.md) removed frames). States persisted before this feature lack it — handled `.get`-style, rendered as "—", same policy as the capex-era price fields.

- `propose_completion(objective: "price" | "co2" = "price")` — stores the candidate with its footprint; the tool message names the objective ("cheapest monthly completion" / "lowest-footprint completion"). In the same call it also solves the *other* objective, and when the two assignments differ appends one line: how many variables differ and both deltas ("a lowest-footprint completion differs in 3 variables: −4.1 t CO₂e, +€120/month — offer to show the pair"). This settles the first-proposal tension named in the requirements: the default objective remains cheapest, and it is disclosed rather than silent, because the alternative is *always* computed and shown, so [trade-offs shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md) is satisfied at the moment of proposal rather than only on request. One extra Optimize solve per proposal, milliseconds at this scale.
- *Cheapest-vs-greenest side by side* needs no new tool: `propose_completion()` → `fork_draft("Lowest footprint")` → `propose_completion(objective="co2")` → `compare_drafts("Lowest footprint")` — the drafts machinery is exactly this flow (`save_frame` / `compare_frames` until [parallel-drafts](../parallel-drafts/design.md); the sequence moved onto the new names with it). Per [where guidance lives](../agent-tools/design.md), the four-step sequence is taught by `propose_completion`'s docstring and its conversational trigger — offer the pair when the customer signals footprint interest — by the system prompt.
- The comparison payload (`frame_comparison`, `draft_comparison` since [parallel-drafts](../parallel-drafts/design.md)) — each side gains its `footprint` breakdown; the payload gains `footprintDelta`. The per-variable difference rows keep price deltas only: an option-level co2 column is the badge format decision 6 bans, and use-phase is not attributable to single options at all (it belongs to the class/usage/travel trio, which appear as difference rows themselves when they differ). The pair-level delta is the requirements' criterion, and the sanctioned format per the moral-licensing evidence.
- `describe_product` — options gain their embodied kg (after multiplier, so quoted numbers reconcile with totals), and the output ends with an assessment-assumptions section rendered from the `footprint` block plus the illustrative-model sentence. This is what lets the agent answer "how much CO₂ does the panoramic glass wall add?" from model data (constitution #1) — stating an embodied delta on request in chat is not a badge.
- `get_configuration` mentions the candidate's footprint alongside its monthly fee.

Tool surface otherwise unchanged, as the requirements expect. `ask_choices` payloads carry no co2; `energy_package` renders as chips under the existing heuristic with no changes.

## System prompt

Additions, coupled to card copy as always: quote footprint only from tool results or `describe_product` data, never estimate; always "modelled, under these assumptions", class never presented as certified or styled as a label; comparative and conditional phrasing only — the words "green", "eco-friendly", "sustainable" are prohibited; surface the assumptions (service life, usage profile, grid factor, module scope) when asked what a number assumes; offer the cheapest/greenest pair when the customer signals footprint interest. All of these are voice rules and stay in the prompt under [where guidance lives](../agent-tools/design.md) — they have to hold on turns where no tool is called, which is exactly when a figure would be invented.

## Frontend

- `configurator.ts`: `Footprint` type, `formatCO2()` (kg → "12.4 t CO₂e"), the `footprint` block exported for the assumptions panel. No arithmetic.
- One lifetime total is quoted on two surfaces — the canvas formats it with `formatCO2`, the agent's prose with `_format_co2` in `configuration.py` — so the two agree on the rounding rule: tenths round half away from zero. They did not at first, because Python's `:.1f` rounds half to even, and 1250 kg read 1.2 t in chat beside 1.3 t on the sheet. Nothing can share the code across the two runtimes; the rule is written down in both, and each cites the other.
- Canvas: in the consideration clause that closes the operative terms ([agreement-document](../agreement-document/design.md)), under the monthly figure, the candidate's lifetime total — "≈ 14.2 t CO₂e over 25 years (modelled)" — with an assumptions disclosure (popover) showing the embodied/use-phase split, service life, usage profile in effect, grid factor with the decarbonising bookend figure, module scope, and the illustrative-model sentence, all read from the model JSON.
- `energy_class` renders as an ordinary forced row — its "(modelled)" label does the work; no EU-label styling anywhere, no co2 in row editors or ask-choices cards.
- `draft-comparison.tsx` (`frame-comparison.tsx` then): footprint delta rendered next to the price delta; a side without a stored footprint shows "—" at delta 0, the established fallback.

## Considered and deferred: green value ordering

The requirements ask for this to be settled before implementation. Settled: *stays deferred.* Biasing solver search order toward low-carbon options remains a silent discretionary preference until the canvas can show provenance for it, and this feature adds no such provenance surface. The explicit `objective="co2"` completion covers the user-steered version of the same intent. Revisit only with a disclosed-provenance design.

## Notes from implementation

- The `annual_kwh` values were generated from a small offline model in the Barney & Lorente shape: daily energy = trips/day × effective travel per trip × a per-class running factor (D 3.0, C 2.6, B 2.0 Wh/m·trip; A = B under regeneration) + per-class standby power (D 150 W, C 75 W, B/A 40 W) × standing hours, with the regeneration fraction 0.10 + 0.04 per travel band + 0.07 per usage step (peaking at 40%, inside the published 20–40% band). The derivation is not in the repo — the validator's shape checks are the durable guarantee, as designed.
- Calibration landed at 8,503 kg embodied for the 630 kg / 12 m reference (anchor ~8,500), with `platform` values 2,200–3,200 kg CO₂e — differentiated only mildly, per the §6 recommendation. The second EPD anchor (~21 t at 1,600 kg) is *not* reconciled — a 1,600 kg configuration models at roughly half that — and no validator check claims it.
- On the real model the two objectives disagree out of the box: an office / mid-travel / medium-usage completion differs in 6 variables, −10.9 t CO₂e for +34 EUR/month — a usable demo pair even before the travel-band case.
- `energy_class` statuses are only forced once drive and energy package are known; before that the variable renders as an open row like any other. The "(modelled)" label is in the variable's data, as designed.
- One addition beyond the draft: candidates also carry an optional `objective` key ("price" / "co2"). The canvas header subtitle names the candidate's objective ([agreement-document design](../agreement-document/design.md)), and with two objectives a hardcoded "cheapest completion" would mislabel a lowest-footprint candidate. Absent on pre-footprint threads, which were always cheapest.
- Browser pass (2026-08-13): the header figure, assumptions popover, teaser-then-pair flow, footprint row and double delta in the comparison card, resumption with the objective label, per-option embodied answers (glass wall 570 kg vs travel band 4,940 kg — both exactly ×1.9 the model values) and the R35 refusal all behaved as specified; agent vocabulary stayed comparative and modelled throughout. Two conversation-quality findings: the agent asserted the *direction* of the eco package's effect from intuition — backwards — which the number-only claims discipline did not fence, so the system prompt now also forbids un-tooled directional claims (compare completions and quote deltas instead); and gpt-5.4-mini sometimes records a hypothetical ("how much would X add?") as a commitment via set_choices — observed once, corrected conversationally, no fix identified that doesn't fight the canvas-edit grammar. A third observation — a new conversation inheriting the previous thread's choices — reproduces without this feature and belongs to [nonlinear-interaction](../nonlinear-interaction/design.md).

## Validation and tests

- Loader errors: missing `co2` on any option (when `footprint` present), `annual_kwh` not covering the class × usage × travel domains exactly, non-numeric factors.
- Validator, beyond the automatic satisfiability/dead-option coverage of the new variables:
  - *Determinacy* — every feasible (drive, energy_package) pair forces exactly one `energy_class`.
  - *Conflict scenario* — regen + hydraulic platform is unsat with R35 in the explanation.
  - *Standby inversion* — for every travel band, eco-vs-standard relative saving is strictly greater at `low` usage than at `heavy`.
  - *Conditional regeneration* — regen-vs-eco relative saving strictly increases with usage and with travel band; class monotonicity A ≤ B ≤ C ≤ D per cell.
  - *Calibration* — the reference configuration's embodied total lands within ±25% of the ~8.5 t EPD anchor.
  These make the acceptance criteria's table-shape clauses automated rather than eyeballed.
- pytest: `objective="co2"` returns a valid minimal-footprint completion (cross-checked by brute force on sampled choice sets), monthly tie-break, `footprint()` arithmetic including the bookend, comparison payload footprint deltas and the pre-footprint "—" fallback, the propose-teaser line, loader errors.
- Browser pass (constitution #9): the travel-band-vs-finish demo case (price and footprint disagree on evidence that survives the factor uncertainties); eco package on a low-traffic residential unit vs a busy office (the inversion, narrated); cheapest/greenest pair via the parallel-candidate machinery (frames then, drafts now); assumptions panel and an "what does that assume?" chat probe; vocabulary spot-check of agent replies.
