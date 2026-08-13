# Every "no" carries its reason

Unavailability, forcing, and conflict are always accompanied by the named rules that caused them, traced to a solver core.

*Grounded in* what Z3 can actually prove — named unsat cores, `consequences` ([../../research/solver-choice.md](../../research/solver-choice.md)). Constitution #6 is its engineering statement, and the ceiling on what the interface may claim.

*Rules out* greyed-out options with no explanation, and any justification the LLM composed rather than verbalized.

*Test.* Does the reason survive being checked against the model file?

*Where it needs a second mechanism.* Discretionary agent choices have no unsat core to ground them, so the same discipline runs through named default heuristics (D-rules) in the product model rather than through cores ([../models/Conversation moves.md](../models/Conversation%20moves.md) §5).

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [cores are enough for trust](../assertions/cores-are-enough-for-trust.md) — the assertion that cores suffice
