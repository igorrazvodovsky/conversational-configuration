# Elevator-as-a-service pivot — design

The pivot is almost entirely model data plus pricing arithmetic. The solver encoding, the tool surface, the card-dispatch machinery and thread resumption are untouched; what changes is what the variables mean, what a price is, and how the agent talks.

## Service variables are ordinary variables in a new leading group

A new group `agreement` opens `elevator.json`. The [canvas](../configuration-canvas/design.md) renders groups in model order, so placing the group first puts outcome terms above the derived hardware spec with no frontend layout logic — the requirements' grouping criterion falls out of data order.

| Variable | Options | Priced |
|---|---|---|
| `service_level` | basic / standard / premium — labels written as outcomes ("99.9 % uptime, 4 h response"), not tiers | EUR/month |
| `contract_term` | y5 / y10 / y15 | amortization horizon, no own price |
| `usage_profile` | low / medium / heavy — labels in traffic terms ("a few trips an hour") | EUR/month |
| `connectivity_package` | none / connected | EUR/month |

Coupling constraints continue the R-series (exact tables tuned at implementation against the validator's dead-option check):

- *R31* — premium service level requires the connectivity package: the uptime promise depends on remote monitoring.
- *R32* — heavy usage excludes the hydraulic drive (the light-duty platform), the requirements' second worked example.
- *R33* — building type bounds plausible usage profiles (table): residential low–medium, hotel medium, office medium–heavy, retail medium–heavy, hospital heavy. The mapping approximates the ISO 25745 usage categories in the [footprint spec](../environmental-footprint/requirements.md) decision 5, and reconciles exactly when that spec introduces its energy tables — `usage_profile` is the shared variable, introduced here.
- *R34* — hospitals require at least the standard service level.

To the solver these are enum variables like any other: `valid_options`, `explain`, `repairs` and the frame machinery work over them unchanged, which is what the requirements' ripple-across-terms-and-hardware criterion relies on.

## Pricing: cost basis amortized to a monthly fee

Hardware options keep their `price` scalar, reinterpreted as *cost basis* (EUR) — an input to the monthly derivation, never customer-facing. Agreement options carry a new `monthly_price` (EUR/month). A top-level `pricing` block holds `financing_factor`, `term_months` (map over `contract_term` values), and `default_term`.

The requirements say the capex price field is "replaced, not kept alongside"; the reading implemented here is that the *capex figure as a customer-facing price* is replaced — candidate totals, frames, comparisons and option deltas are all EUR/month — while the option-level cost basis must remain in the data, because the same requirements derive the fee by amortizing hardware over the term.

```
monthly(assignment) = round(Σ hardware price × financing_factor / months(contract_term))
                    + Σ monthly_price(service_level, usage_profile, connectivity_package)
```

`financing_factor` (illustrative, ~1.25) stands in for installation, financing and margin — one named number in the model data, not in code. All numbers stay illustrative per the requirements' out-of-scope list.

*Rejected alternative:* authoring monthly prices directly on hardware options. It breaks amortization — changing the contract term would not change the fee — and fails the acceptance criterion that derives the fee from term, service level and usage.

## Solver: monthly objective by per-term iteration

`complete()` keeps its signature and now returns `(assignment, monthly)`. For a *fixed* term, minimizing the monthly fee is equivalent to minimizing `Σ hardware price × financing_factor + months × Σ monthly_price` — separable per option, so it is the existing If-sum objective with different weights. When the term is unchosen, iterate the term options the solver hasn't ruled out (≤ 3 `Optimize` solves), keep the lowest monthly; ties go to the shorter term (less commitment).

*Rejected alternative:* one `Optimize` objective containing the division. Z3 integer division makes the objective nonlinear and harder to trust, for no benefit at three term options.

The completion objective remains "cheapest", now cheapest-monthly. Per the requirements this stays the disclosed known violation of [trade-offs are shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md) until footprint lands — so every surface that shows the candidate names its objective (see Frontend) rather than presenting it as neutral.

## State and tools

Tool surface unchanged, per the requirements. Semantic shifts inside `agent/src/configuration.py`:

- `Candidate.price` and `Frame.price` now mean EUR/month. The key names are deliberately unchanged: renaming would break threads persisted by [thread resumption](../nonlinear-interaction/design.md). A thread saved before the pivot shows its stale capex number until its next completion — accepted, prototype-honest.
- `frame_comparison`: per-side option deltas become monthly deltas computed at *each side's own term* (two agreements may differ precisely in term); `priceDelta` is a monthly delta. This keeps the requirements' comparison criterion correct when the term itself is a difference.
- `build_ask_payload` option prices become monthly deltas at the term in effect (chosen, else the candidate's, else `default_term`).
- `describe_product` prints agreement options with their /month prices and hardware options as monthly deltas at `default_term`, marked as such — the LLM should never see a capex figure it could leak.

## System prompt

Rewritten around the service frame: elicitation targets the building and its outcomes (building type, floors/traffic, budget *per month*, uptime expectation, how long they want to commit); proposals are presented as service agreements ("€X/month over the 10-year term"); mid-contract changes go through `revise_choices` exactly as before. One explicit prohibition mirrors the acceptance criterion: never quote a one-off capex figure. Card copy and prompt wording stay coupled (`card-dispatch.ts` contract) — the structured messages themselves don't change.

## Frontend

- `src/lib/configurator.ts`: types for the `pricing` block; `formatMonthly()`; `monthlyDelta(option, termMonths)` — the single place the frontend re-derives money, from the same imported JSON the agent reads.
- Canvas (`config-canvas/index.tsx`): no layout change — group order does the grouping. The header becomes the agreement header: monthly figure with its objective named ("cheapest completion — €X/month"), title "Service agreement". The existing provenance badges (you/agent/auto/proposed) already carry the requirements' provenance clause; they correspond to the four provenance strata in [the conversation move inventory](../../discovery/models/Conversation%20moves.md) §1.
- `frame-comparison.tsx`, `ask-choices.tsx`: render /month values from the updated payloads; no structural change.

## Validation and tests

- `agent/src/solver/model.py`: parse `monthly_price` and the `pricing` block; loader errors when `term_months` does not cover the `contract_term` domain exactly, or when an option carries both `price` and `monthly_price`.
- `validate.py`: the agreement variables ride the existing satisfiability and dead-option checks automatically (the requirements' first criterion). New scenarios: premium forces connectivity (R31); heavy usage + hydraulic platform is unsat with R32 in the explanation; hospital + basic service is unsat (R34); pricing sanity — for identical choices the longest term yields the lowest monthly.
- pytest: `complete()` term iteration and tie-break; monthly arithmetic; frame comparison across two different terms; ask-payload monthly deltas.
- Conversation and UI behavior: browser pass via `npm run dev` (constitution #9) — fresh outcome-first conversation to a monthly proposal, a mid-contract revision rippling across service and hardware, a two-agreement comparison.
