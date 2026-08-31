# Every refusal names the rules that caused it

Unavailability, forcing and conflict are always accompanied by the named rules that caused them, traced to a solver core.

*Grounded in* what Z3 can actually prove: named unsat cores and `consequences` ([solver choice](../../research/solver-choice.md)). Constitution #6 is its engineering statement, and it sets the ceiling on what the interface may claim.

*Rules out* greyed-out options with no explanation, and any justification the LLM composed rather than verbalized.

*Test.* Does the reason survive being checked against the model file, and does it reach someone who is not holding a mouse?

*What the walkthrough of 2026-08-20 found.* The reasons that were shown survived the check, and most refusals showed no reason at all.

A repair card quotes the model's own labels verbatim. The two behind the speed collision read "Rated speed determines minimum headroom" and "Modernization cannot raise the existing headroom to 4600 mm", which are R04 and R28 as written.

Every other refusal in the walkthrough named nothing. An option ruled out in the canvas editor or in an in-chat control card rendered struck through and disabled under a native `title` reading "ruled out by your other choices", or in one card the bare word "unavailable", which no keyboard or touch user reaches and which points at no rule. A rule-forced value wasn't clickable and stated nothing. A rejected `set_choices` reached the agent carrying "Violated rules: R14: Travel height constrains number of stops" and came back to the customer as prose with no rule in it. The deviation register on the sheet gave the clause, the asked value and the offered one, and left the rules that separate them to the chat.

The mechanism wasn't the constraint. `SolverService.explain` returns a named core and `Conflict.describe` formats it. Rule labels reached the agent in only two payloads, repairs and RFQ deviations, so when the customer asked why a forced value was there, the agent composed the answer from current state. Asked "Why this accessibility package?" it gave an account that checks out against the model — hospital, new public building, Europe, so R17, R18 and R12 — and quoted no rule and verbalized no core, which is the composed justification this principle rules out.

It was repaired the same day. State carries the named rules behind every option that can't be taken, so the editor, the in-chat cards, the deviation mark on the sheet and the agent's own answer all quote the model's labels ([agent-tools](../../specs/agent-tools/design.md), [agreement-document](../../specs/agreement-document/design.md)). What the principle still lacks a mechanism for is unchanged: discretionary defaults have no rule to cite, and the D-rules that would give them one are specified and unbuilt.

*The other half of that walkthrough took until 2026-08-30.* The repair above moved the rules into state; it did not move them out of the `title` they arrived on. Three of the four controls that refuse an option kept them there, so for four months the named cores were reaching the browser correctly and stopping one hop short of anyone using a keyboard or a touch screen — the defect this note recorded in those words and did not close. They now render as visible text under the control that refuses, with the control pointing at that line, and a check asserts it for all four. The control is no longer disabled either — under constitution #17 a ruled-out option takes the click and comes back with the repairs that would admit it — which is the same test read once more: a rule named to somebody who cannot reach the control it sits on is still named to nobody. Constitution #16 is the engineering statement of that half, as #6 is of the first. The lesson is about the principle's own test: *does the reason survive being checked against the model file* asks whether the reason is true, and a second question was doing quiet work beside it — whether the reason arrives at all. A rule named to nobody is not named.

*Where it needs a second mechanism.* Discretionary agent choices have no unsat core to ground them, so the same discipline runs through named default heuristics, the D-rules, in the product model rather than through cores ([Conversation moves](../models/Conversation%20moves.md), *Delegation moves*). These are specified but not yet in the model, and the gap is recorded in the [product-model design](../../specs/product-model/design.md).

## Related

- [The principle index](../direction.md)
- [unsat cores are sufficient for trust](../assertions/cores-are-sufficient-for-trust.md) — the assertion that cores suffice
