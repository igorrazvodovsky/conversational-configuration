# Solver choice — why Z3

Status: technology evaluation, decided and implemented in the [solver service](../specs/solver-service/design.md).

Interactive configuration, rather than one-shot solving, sets the requirements:

- Fast incremental re-solve after each choice.
- *Consequence propagation* — which remaining values are still valid, so the interface can grey out the rest.
- *Conflict explanation* — a minimal unsat core, so the agent can say "X conflicts with Y because rule R".
- Optimization, as a plus.

Verdict: *Z3, through its Python bindings*. It is the only candidate that covers all three defining operations natively, in one persistent solver session.

- Assumption-based `check()` re-solves incrementally in under a millisecond. Nothing is retracted, and learned clauses are kept.
- `Solver.consequences(assumptions, terms)` returns, in one call, every option value forced true or false under the current choices. That is exactly the grey-out operation, and no other solver has it built in.
- `unsat_core()` over named assumptions (`assert_and_track`) returns cores that cite business-rule names the agent can verbalize. A simple deletion loop shrinks a core to a true minimal unsatisfiable subset (MUS).
- `Optimize` finds the cheapest valid completion.

Z3 also carries an MIT license, installs as a single pip wheel, and has an officially maintained WebAssembly and TypeScript twin (`z3-solver` on npm) should solving ever move to the client.

Runners-up:

- *OR-Tools CP-SAT* has the best optimizer of the set, but it is stateless per solve. Computing valid domains costs N re-solves, and its cores aren't guaranteed minimal.
- *clingo and ASP* propagate brave consequences elegantly, but the explanation story is weak and the learning curve is steep.
- *CPMpy* is an Apache 2.0 modeling layer targeting both CP-SAT and Z3, shipping MUS and QuickXplain tools. Worth knowing about if hand-rolling MUS ever becomes tedious.
- *flamapy and BDD* are the Configit-style industrial pattern, and overkill at prototype scale.

MiniZinc and python-constraint fail the interactivity requirements.

Reference: [Programming Z3 §4.6, on consequences and cores](https://z3prover.github.io/papers/programmingz3.html).

Interaction consequence: those three operations are what the interface may lean on, and the ceiling on what it may claim ([problem framing](../discovery/problem-framing.md), *Contextual statements*, *Technology*; [every refusal names the rules that caused it](../discovery/principles/refusals-name-their-rules.md)).

## Related

- [The CSP formulation Z3 is solving](configuration-field.md)
- [Green value-ordering, an unexploited Z3-level idea](footprint/sustainability-prior-art.md)
