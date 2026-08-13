# Elevator as a service — tasks

Requirements approved 2026-08-13; implemented 2026-08-13.

- [x] Model data: `agreement` group (service_level, contract_term, usage_profile, connectivity_package) first in `elevator.json`, R31–R34 couplings, `pricing` block, monthly prices on agreement options
- [x] Loader (`model.py`): `monthly_price` + `pricing` block parsing, completeness errors (term_months coverage; no option with both price kinds)
- [x] Solver: `complete()` cheapest-monthly objective via per-term iteration, shorter-term tie-break; unit tests
- [x] Validator: new scenarios (R31 forcing, R32 conflict, R34 conflict, longest-term-cheapest sanity); passes with zero dead options
- [x] State/tools: monthly semantics for candidate and frames, `frame_comparison` per-side-term monthly deltas, `build_ask_payload` monthly deltas, `describe_product` monthly rendering; unit tests updated
- [x] System prompt: outcome-first elicitation (building, traffic, budget/month, uptime, term), service-agreement framing, no capex figures
- [x] Frontend: `formatMonthly`/`monthlyDelta` in `configurator.ts`, canvas header (title, /month figure, named objective), /month rendering in frame-comparison and ask-choices
- [x] Reconcile the [product-model](../product-model/design.md), [solver-service](../solver-service/design.md), [agent-tools](../agent-tools/design.md) and [configuration-canvas](../configuration-canvas/design.md) designs with the pricing and grouping changes
- [x] Browser pass (constitution #9): outcome-first office conversation → €1,365/month over 10 years with R31 forcing connectivity; mid-contract hospital conversion → repair card with ripple across service (usage profile) and hardware (platform, accessibility), applied atomically to €1,883/month; frame comparison premium vs current → 14 differences with per-side monthly deltas and a €518/month delta
- [x] Anchor: update this file, reconcile requirements/design with what was built, update the feature index in [specs/README](../README.md)
