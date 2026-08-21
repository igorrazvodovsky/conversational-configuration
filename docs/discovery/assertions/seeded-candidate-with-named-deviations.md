# A document-seeded candidate with named deviations is better than manual compliance checking

An inbound requirements document can seed the agreement: extract its requirements as commitments, propose a valid whole that satisfies as many as possible, and present each unmet requirement as a named deviation with its requested value, its offered value, and the rules that separate them. Reconciling that register is better than reading the document against the catalogue by hand, and better than re-eliciting what the document already settles.

If this fails, RFQ ingestion collapses back into elicitation, with the user retyping their own document into the chat, and the shift from *explaining what they need* to *reconciling deviations* never happens.

*Evidence today.* Deviation registers and compliance statements are existing tender practice, produced by hand by sales engineers, so the artifact is real and only its computation is new. The core-grounded explanation it relies on has consensus behind it ([unsat cores are sufficient for trust](cores-are-sufficient-for-trust.md)). The [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md) is built, so the flow is demonstrable rather than hypothetical: an over-constrained tender seeds a valid whole, names the one requirement it can't meet along with the rules behind it, and the register works down to clean. That establishes feasibility rather than the assertion itself. Whether a reader trusts the seeded commitments instead of re-checking them against their own document needs users, which this prototype doesn't evaluate with.

*How we would know it is wrong.* Users distrust the seeded commitments and re-verify each one against the document, so seeding saves nothing. Or the deviation register reads as the vendor's refusal rather than as negotiable positions, and users abandon instead of reconciling.

*Status.* Walked in the app on 2026-08-20, twice, on the office-tower fixture. The second run behaved as the claim requires: twelve requirements seeded and sourced to their clauses, one deviation raised against the rated speed with the offered value beside the asked one, the budget gap reported as commercial pressure rather than a rule, accepting the offer leaving the clause "waived, still listed" with a Reopen, and the closing question covering only what the document left open.

The first run didn't map clause 1.2, and the consequence is worse than a missing deviation. The solver derived a new build from the speed, and the recitals then read "installed into the shaft of the new building" against a document whose clause 1.2 says the shaft isn't being altered — no deviation raised, no clause cited, and an "auto" badge implying the rules produced it. The fixture's own clause 7.2 calls silent substitution grounds for disqualification. The register is only as trustworthy as the mapping, and the mapping is a model call rather than a solver one.

One thing the walkthrough faulted has since been fixed: the deviation on the sheet carries the rules that separate the ask from the offer, so the register is readable without the conversation that produced it.

*What rests on it.* The [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md); the document entry point added to [configuration can start from any variable, in any order](../principles/start-from-any-variable.md); and the [delivery lead](../jtbd/persona-delivery-lead.md)'s entry into the workspace that the [operator](../jtbd/persona-building-operator.md) later revises.

## Related

- [The assertion index](../problem-framing.md), with *Contextual statements* for the procurement context
- [showing a candidate works better than asking a sequence of questions](candidate-works-better-than-questions.md) — the claim this specializes to document-seeded starts
- [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md) — a deviation is a refusal of the customer's own document, and it carries its rule
