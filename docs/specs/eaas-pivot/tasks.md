# Elevator-as-a-service pivot — tasks

Requirements approved 2026-08-13; design drafted 2026-08-13. Implementation not started.

- [ ] Model data: `agreement` group (service_level, contract_term, usage_profile, connectivity_package) first in `elevator.json`, R31–R34 couplings, `pricing` block, monthly prices on agreement options
- [ ] Loader (`model.py`): `monthly_price` + `pricing` block parsing, completeness errors (term_months coverage; no option with both price kinds)
- [ ] Solver: `complete()` cheapest-monthly objective via per-term iteration, shorter-term tie-break; unit tests
- [ ] Validator: new scenarios (R31 forcing, R32 conflict, R34 conflict, longest-term-cheapest sanity); must pass with zero dead options
- [ ] State/tools: monthly semantics for candidate and frames, `frame_comparison` per-side-term monthly deltas, `build_ask_payload` monthly deltas, `describe_product` monthly rendering; unit tests updated
- [ ] System prompt: outcome-first elicitation (building, traffic, budget/month, uptime, term), service-agreement framing, no capex figures
- [ ] Frontend: `formatMonthly`/`monthlyDelta` in `configurator.ts`, canvas header (title, /month figure, named objective), /month rendering in frame-comparison and ask-choices
- [ ] Reconcile the [product-model](../product-model/design.md), [solver-service](../solver-service/design.md), [agent-tools](../agent-tools/design.md) and [configuration-canvas](../configuration-canvas/design.md) designs with the pricing and grouping changes
- [ ] Browser pass (constitution #9): fresh outcome-first conversation → monthly proposal; mid-contract revision with ripple across service terms and hardware; two-agreement comparison with monthly delta
- [ ] Anchor: update this file, reconcile requirements/design with what was built, update the feature index in [specs/README](../README.md)
