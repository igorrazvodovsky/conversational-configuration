# 001 — Design

## Decisions

- *Single JSON file* (`agent/src/product_model/elevator.json`), no code in the model. Per constitution #2, adding a variant means editing data only.
- *Enum-only domains.* All variables, including dimensions, are finite enums (e.g. shaft tiers `t1_1800x1700`…`t6_3000x3000`). Real formulas (load → car area) are encoded as allowed-pair tables instead of arithmetic. Rationale: keeps the solver encoding trivial and the model inspectable; numeric variables can be introduced later without changing the schema's shape.
- *Two constraint types only:* `table` (allowed value pairs across two variables) and `implication` (`if_all` conditions → `then` membership). Everything observed in real configurators (requires, excludes, compatibility, code rules) reduced cleanly to these two.
- *Named rules.* Every constraint has an `id` (R01…R30) and a `label` written as the sentence the agent should be able to say when the rule appears in an unsat core (constitution #6).
- *Price as option-level deltas* (EUR) on customer-facing options; civil-works variables (shaft, pit, headroom) are unpriced.
- Grounding: EN 81-20 dimension tables and KONE MonoSpace planning data for numbers; platform-caps-performance structure from Tacton-style CPQ; scale target (~23 vars, 30 rules) chosen per the Sisyphus-VT benchmark discussion in [docs/research/configuration-field.md](../../docs/research/configuration-field.md).

## Validator

`agent/src/product_model/validate.py` builds a Z3 model (Int per variable over option indices) and checks: global satisfiability, dead options (per-value SAT probe), and the scenario suite from requirements. Run from `agent/`: `uv run python src/product_model/validate.py`. It must pass after any model edit.
