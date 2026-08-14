# Elevator as a service — design

The service frame is almost entirely model data plus pricing arithmetic. The solver encoding, the tool surface, the card-dispatch machinery and thread resumption carry no service-specific logic; what the frame determines is what the variables mean, what a price is, and how the agent talks.

## Service variables are ordinary variables in the leading group

The `agreement` group opens `elevator.json`. The [canvas](../agreement-document/design.md) maps that group onto the operative terms and the hardware groups onto the schedules, and renders in model order within each layer, so outcome terms stand above the derived hardware spec — the requirements' grouping criterion falls out of the data plus that one mapping, with no per-variable layout decision.

| Variable | Options | Priced |
|---|---|---|
| `service_level` | basic / standard / premium — labels written as outcomes ("99.9 % uptime, 4 h response"), not tiers | EUR/month |
| `contract_term` | y5 / y10 / y15 | amortization horizon, no own price |
| `usage_profile` | low / medium / heavy — labels in traffic terms ("a few trips an hour") | EUR/month |
| `connectivity_package` | none / connected | EUR/month |

Coupling constraints continue the R-series:

- *R31* — premium service level requires the connectivity package: the uptime promise depends on remote monitoring.
- *R32* — heavy usage excludes the hydraulic drive (the light-duty platform), the requirements' second worked example.
- *R33* — building type bounds plausible usage profiles (table): residential low–medium, hotel medium, office medium–heavy, retail medium–heavy, hospital heavy. The mapping approximates the ISO 25745 usage categories in the [footprint spec](../environmental-footprint/requirements.md) decision 5, and reconciles exactly when that spec introduces its energy tables — `usage_profile` is the shared variable, introduced here.
- *R34* — hospitals require at least the standard service level.

To the solver these are enum variables like any other: `valid_options`, `explain`, `repairs` and the frame machinery work over them unchanged, which is what the requirements' ripple-across-terms-and-hardware criterion relies on.

## Pricing: cost basis amortized to a monthly fee

Hardware options carry a `price` scalar meaning *cost basis* (EUR) — an input to the monthly derivation, never customer-facing. Agreement options carry `monthly_price` (EUR/month); the loader rejects an option with both. A top-level `pricing` block holds `financing_factor`, `term_months` (map over `contract_term` values), and `default_term`.

Every customer-facing figure — candidate totals, frames, comparisons, option deltas — is EUR/month. The option-level cost basis stays in the data because the fee is derived by amortizing hardware over the term:

```
monthly(assignment) = round(Σ hardware price × financing_factor / months(contract_term))
                    + Σ monthly_price(service_level, usage_profile, connectivity_package)
```

`financing_factor` (illustrative, ~1.25) stands in for installation, financing and margin — one named number in the model data, not in code. All numbers stay illustrative per the requirements' out-of-scope list.

*Rejected alternative:* authoring monthly prices directly on hardware options. It breaks amortization — changing the contract term would not change the fee — and fails the acceptance criterion that derives the fee from term, service level and usage.

## Solver: monthly objective by per-term iteration

`complete()` returns `(assignment, monthly)`. For a *fixed* term, minimizing the monthly fee is equivalent to minimizing `Σ hardware price × financing_factor + months × Σ monthly_price` — separable per option, so it is the existing If-sum objective with different weights. When the term is unchosen, the term options the solver hasn't ruled out are iterated (≤ 3 `Optimize` solves), keeping the lowest monthly; ties go to the shorter term (less commitment).

*Rejected alternative:* one `Optimize` objective containing the division. Z3 integer division makes the objective nonlinear and harder to trust, for no benefit at three term options.

The completion objective is "cheapest", meaning cheapest-monthly. Per the requirements this is the disclosed known violation of [trade-offs are shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md) until footprint lands — so every surface that shows the candidate names its objective (see Frontend) rather than presenting it as neutral.

## State and tools

The tool surface carries no service-specific shape, per the requirements. Semantics in `agent/src/configuration.py`:

- `Candidate.price` and `Frame.price` mean EUR/month. The key names predate the service frame and are deliberately kept: renaming would break threads persisted by [thread resumption](../nonlinear-interaction/design.md). A thread saved under the earlier capex frame shows its stale figure until its next completion, which is accepted as appropriate for a prototype.
- `frame_comparison`: per-side option deltas are monthly deltas computed at *each side's own term* (two agreements may differ in term); `priceDelta` is a monthly delta. This keeps the requirements' comparison criterion correct when the term itself is a difference.
- `build_ask_payload` option prices are monthly deltas at the term in effect (chosen, else the candidate's, else `default_term`).
- `describe_product` prints agreement options with their /month prices and hardware options as monthly deltas at `default_term`, marked as such — the LLM never sees a capex figure it could leak.

## System prompt

Framed around the service offering: elicitation targets the building and its outcomes (building type, floors/traffic, budget *per month*, uptime expectation, how long they want to commit); proposals are presented as service agreements ("€X/month over the 10-year term"); mid-contract changes go through `revise_choices` like any other revision. One explicit prohibition mirrors the acceptance criterion: never quote a one-off capex figure. Card copy and prompt wording stay coupled (`card-dispatch.ts` contract).

## Frontend

- `src/lib/configurator.ts`: types for the `pricing` block; `formatMonthly()`; `monthlyDelta(option, termMonths)` — the single place the frontend re-derives money, from the same imported JSON the agent reads.
- Canvas (`config-canvas/index.tsx`): no per-variable layout logic — the group-to-layer mapping does it. The header is the agreement header: monthly figure with its objective named ("cheapest completion"), title "Service agreement". The existing provenance badges (you/agent/auto/proposed) carry the requirements' provenance clause. They carry three of the four provenance strata in [the conversation move inventory](../../discovery/models/Conversation%20moves.md) §1 — you/agent/auto for user-chosen, agent-chosen and solver-forced; *proposed* marks the candidate's suggestion on an open row, which is not a stratum, and the model's fourth stratum, *derived*, has no badge of its own — derived hardware renders as forced or proposed depending on how it was computed.
- `frame-comparison.tsx`, `ask-choices.tsx`: render /month values from the payloads; no structural difference from other cards.

## Validation and tests

- `agent/src/solver/model.py`: parses `monthly_price` and the `pricing` block; loader errors when `term_months` does not cover the `contract_term` domain exactly, or when an option carries both `price` and `monthly_price`. The monthly arithmetic (`ProductModel.monthly`, `monthly_option_delta`) lives here too, with *half-up* rounding rather than Python's banker's rounding — the frontend re-derives deltas with `Math.round`, and the two must agree on ties.
- `validate.py`: the agreement variables ride the existing satisfiability and dead-option checks automatically (the requirements' first criterion). Scenarios: premium forces connectivity (R31); heavy usage + hydraulic drive is unsat with R32 in the explanation; hospital + basic service is unsat (R34); pricing sanity — for identical choices the longest term yields the lowest monthly.
- pytest: `complete()` term iteration and tie-break; monthly arithmetic; frame comparison across two different terms; ask-payload monthly deltas; loader pricing errors.
- Conversation and UI behavior: browser pass via `npm run dev` (constitution #9) — fresh outcome-first conversation to a monthly proposal, a mid-contract revision rippling across service and hardware, a two-agreement comparison.

## Notes from implementation

- Frames persisted under the earlier capex frame lack the agreement variables entirely, not just a stale price; `frame_comparison` renders a missing side as "—" at delta 0 instead of crashing, and `months_of` falls back to the default term when an assignment has no `contract_term`.
- Browser pass (office → hospital conversion scenario): the R33 repair card carried the ripple across usage profile, accessibility, and platform in one card; applying it moved the agreement from €1,365/month to €1,883/month atomically, and the frame comparison priced each side's hardware at its own term with a correct €518/month delta. The agent kept every quoted figure monthly, unprompted.
