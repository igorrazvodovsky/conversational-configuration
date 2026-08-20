# Every refusal names the rules that caused it

Unavailability, forcing, and conflict are always accompanied by the named rules that caused them, traced to a solver core.

*Grounded in* what Z3 can actually prove: named unsat cores and `consequences` ([../../research/solver-choice.md](../../research/solver-choice.md)). Constitution #6 is its engineering statement, and sets the ceiling on what the interface may claim.

*Rules out* greyed-out options with no explanation, and any justification the LLM composed rather than verbalized.

*Test.* Does the reason survive being checked against the model file?

*What the walkthrough of 2026-08-20 found.* The reasons that are shown survive the check, and most refusals show no reason at all. A repair card quotes the model's own labels verbatim — the two behind the speed collision read "Rated speed determines minimum headroom" and "Modernization cannot raise the existing headroom to 4600 mm", which are R04 and R28 as written. Every other refusal in the walkthrough named nothing. An option ruled out in the canvas editor or in an in-chat control card renders struck through and disabled under a native `title` reading "ruled out by your other choices" (or, in one card, the bare word "unavailable"), which no keyboard or touch user reaches and which points at no rule. A rule-forced value is not clickable and states nothing. A rejected `set_choices` reaches the agent carrying "Violated rules: R14: Travel height constrains number of stops" and comes back to the customer as prose with no rule in it. The deviation register on the sheet gives the clause, the asked value and the offered one, and leaves the rules that separate them to the chat. The mechanism is not the constraint: `SolverService.explain` returns a named core and `Conflict.describe` formats it. Rule labels reach the agent in only two payloads, repairs and RFQ deviations, so when the customer asks why a forced value is there the agent composes the answer from current state. Asked "Why this accessibility package?" it gave an account that checks out against the model (hospital, new public building, Europe: R17, R18, R12) and quoted no rule and verbalized no core — the composed justification this principle rules out. Repaired the same day: state now carries the named rules behind every option that cannot be taken, so the editor, the in-chat cards, the deviation mark on the sheet and the agent's own answer all quote the model's labels ([agent-tools](../../specs/agent-tools/design.md), [agreement-document](../../specs/agreement-document/design.md)). What the principle still lacks a mechanism for is unchanged: discretionary defaults have no rule to cite, and the D-rules that would give them one are specified and unbuilt.

*Where it needs a second mechanism.* Discretionary agent choices have no unsat core to ground them, so the same discipline runs through named default heuristics (D-rules) in the product model rather than through cores ([../models/Conversation moves.md](../models/Conversation%20moves.md) §5). These are specified but not yet in the model; the gap is recorded in the [product-model design](../../specs/product-model/design.md).

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [unsat cores are sufficient for trust](../assertions/cores-are-sufficient-for-trust.md) — the assertion that cores suffice
