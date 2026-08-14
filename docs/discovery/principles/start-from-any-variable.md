# Configuration can start from any variable, in any order

The user may start from any variable, in any order, and edit anything at any time. Nothing is locked because of when it was decided.

*Grounded in* mixed-initiative practice and in industry configurators' convergence on entry from any angle ([../../research/configuration-field.md](../../research/configuration-field.md)).

*Rules out* required-field ordering and modal steps.

*Test.* Can a session that starts with "the shaft is 1800 by 1700" go as well as one that starts with the building type?

*The limiting case is a document.* An inbound RFQ specifies many variables at once, and the [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md) treats document-seeding as this principle taken to its limit, with [a document-seeded candidate with named deviations is better than manual compliance checking](../assertions/seeded-candidate-with-named-deviations.md) carrying the claim.

*Coverage.* Deliberately exercised in the fourth [demo scenario](../../specs/demo-scenarios/requirements.md): the renewal opens with the bare dimension statement "the shaft is 1800 by 1700", with no canvas control and no pending question, and must land on the right variable without re-eliciting anything settled ([../direction.md](../direction.md) §4).

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [../models/Conversation moves.md](../models/Conversation%20moves.md) §2 — all user moves legal at all times, which is the move-level form of this principle
