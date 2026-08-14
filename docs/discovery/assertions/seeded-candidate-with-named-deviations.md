# A document-seeded candidate with named deviations is better than manual compliance checking

An inbound requirements document can seed the agreement: extract its requirements as commitments, propose a valid whole that satisfies as many as possible, and present each unmet requirement as a named deviation with its requested value, its offered value, and the rules that separate them. Reconciling that register is better than reading the document against the catalogue by hand, and better than re-eliciting what the document already settles.

If this fails, RFQ ingestion collapses back into elicitation, with the user retyping their own document into the chat, and the shift from *explaining what they need* to *reconciling deviations* never happens.

*Evidence today.* Deviation registers and compliance statements are existing tender practice, produced by hand by sales engineers, so the artifact is real and only its computation is new. The core-grounded explanation it relies on has consensus behind it ([unsat cores are sufficient for trust](cores-are-sufficient-for-trust.md)). The [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md) is now built, so the flow is demonstrable rather than hypothetical: an over-constrained tender seeds a valid whole, names the one requirement it cannot meet along with the rules behind it, and the register works down to clean. That establishes feasibility rather than the assertion itself. Whether a reader trusts the seeded commitments instead of re-checking them against their own document needs users, which this prototype does not evaluate with.

*How we would know it is wrong.* Users distrust the seeded commitments and re-verify each one against the document, so seeding saves nothing. Or the deviation register reads as the vendor's refusal rather than as negotiable positions, and users abandon instead of reconciling.

*What rests on it.* The [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md); the document entry point added to [configuration can start from any variable, in any order](../principles/start-from-any-variable.md); and the [delivery lead](../jtbd/persona-delivery-lead.md)'s entry into the workspace that the [operator](../jtbd/persona-building-operator.md) later revises.

## Related

- [../problem-framing.md](../problem-framing.md) §4 — the assertion index, and §3 for the procurement context
- [showing a candidate works better than asking a sequence of questions](candidate-works-better-than-questions.md) — the claim this specializes to document-seeded starts
- [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md) — a deviation is a refusal of the customer's own document, and it carries its rule
