# Configuration can start from any variable, in any order

The user may start from any variable, in any order, and edit anything at any time. Nothing is locked because of when it was decided.

*Grounded in* mixed-initiative practice, and in industry configurators' convergence on entry from any angle ([configuration field](../../research/configuration-field.md)).

*Rules out* required-field ordering and modal steps.

*Test.* Can a session that starts with "the shaft is 1800 by 1700" go as well as one that starts with the building type?

*What the walkthrough of 2026-08-20 found.* The entry half held and the edit-anything half didn't.

"The shaft is 1800 by 1700", typed with no control open and no question pending, landed on the shaft as the customer's own choice and forced the car size and the rated load from it.

But a term that had been decided couldn't be changed on the canvas at all. The option editor rendered every value the solver reports as `invalid`, and the solver computes statuses under the recorded choices as assumptions, so once a variable has a choice its every other value is invalid by construction. Contract term is the clean case: no rule in the product model mentions it, and with fifteen years recorded from the document, five and ten years were both disabled under the hover text "ruled out by your other choices" — which is untrue, since what ruled them out was the customer's own earlier answer. The sheet was editable exactly where nothing had been decided, and revising anything else had to go back through the chat.

It was repaired the same day: the editor asks the swap question — could this value be taken instead — which is what `unavailable` answers, and a decided term offers its alternatives again ([agreement-document](../../specs/agreement-document/design.md)).

*The limiting case is a document.* An inbound RFQ specifies many variables at once, and the [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md) treats document-seeding as this principle taken to its limit, with [a document-seeded candidate with named deviations is better than manual compliance checking](../assertions/seeded-candidate-with-named-deviations.md) carrying the claim.

*Coverage.* It is deliberately exercised in [renewal as revision](../scenarios/renewal-as-revision.md): the renewal opens with the bare dimension statement "the shaft is 1800 by 1700", with no canvas control and no pending question, and it has to land on the right variable without re-eliciting anything settled ([direction](../direction.md), *Examples that make the direction concrete*).

## Related

- [The principle index](../direction.md)
- [All user moves legal at all times](../models/Conversation%20moves.md) — the move-level form of this principle
