# Solver choice — why Z3

Status: technology evaluation, decided and implemented (the [solver service](../specs/solver-service/design.md)). Split from the former `docs/research-and-outline.md` §3. The one place in this folder where the research produced a settled decision rather than a standing hypothesis.

Requirements for interactive configuration (not one-shot solving): fast incremental re-solve after each choice; *consequence propagation* (which remaining values are still valid, to grey out options); *conflict explanation* (minimal unsat core → "X conflicts with Y because rule R"); optimization as a plus.

Recommendation: *Z3 (python bindings)* — the only candidate covering all three defining operations natively in one persistent solver session:

- Assumption-based `check()` — sub-millisecond incremental re-solves; nothing retracted, learned clauses kept.
- `Solver.consequences(assumptions, terms)` — one call returns every option value forced true/false under current choices. Exactly the "grey out invalid options" operation; no other solver has it as a built-in.
- `unsat_core()` over named assumptions (`assert_and_track`) — cores cite business-rule names the agent can verbalize; a simple deletion loop shrinks to a true MUS.
- `Optimize` for cheapest valid completion. MIT license, single pip wheel, and an officially maintained WASM/TypeScript twin (`z3-solver` on npm) if solving ever moves client-side.

Runners-up: OR-Tools CP-SAT (best optimizer, but stateless per solve — valid-domain computation needs N re-solves; cores not guaranteed minimal); clingo/ASP (elegant brave-consequences propagation, weak explanation story, ASP learning curve); CPMpy (Apache 2.0 modeling layer targeting both CP-SAT and Z3, ships MUS/QuickXplain tools — worth knowing if hand-rolling MUS ever feels tedious); flamapy/BDD (the Configit-style industrial pattern; overkill at prototype scale). MiniZinc and python-constraint fail the interactivity requirements.

Reference: Programming Z3 §4.6 (consequences, cores) — https://z3prover.github.io/papers/programmingz3.html

Interaction consequence: the three operations above are what the interface may lean on and the ceiling on what it may claim ([../discovery/problem-framing.md](../discovery/problem-framing.md) §3, *Technology*; [every refusal names the rules that caused it](../discovery/principles/refusals-name-their-rules.md)).

## Related

- [configuration-field.md](configuration-field.md) — the CSP formulation Z3 is solving
- [sustainability-prior-art.md](footprint/sustainability-prior-art.md) — green value-ordering, an unexploited Z3-level idea
