# A seeded candidate with named deviations beats compliance-checking by hand

An inbound requirements document can seed the agreement: extract its requirements as commitments, propose a valid whole that satisfies as many as possible, and present each unmet requirement as a named deviation — requested value, offered value, and the rules that separate them. Reconciling that register beats reading the document against the catalogue by hand, and beats re-eliciting what the document already settles.

Load-bearing for the document entrance: if this fails, RFQ ingestion collapses back into elicitation — the user retypes their own document into the chat — and the flip from *explaining what they need* to *reconciling deviations* never happens.

*Evidence today.* Deviation registers and compliance statements are existing tender practice, produced by hand by sales engineers — the artifact is real, only its computation is new. The core-grounded explanation it relies on has consensus behind it ([cores are enough for trust](cores-are-enough-for-trust.md)). No direct evidence for the seeded flow itself; the [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md) exists to test it.

*How we would know it is wrong.* Users distrust the seeded commitments and re-verify each one against the document, so seeding saves nothing; or the deviation register reads as the vendor's refusal rather than as negotiable positions, and users abandon instead of reconciling.

*What rests on it.* The [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md); the document door added to [any door is an entrance](../principles/any-door-is-an-entrance.md); the [delivery lead](../jtbd/persona-delivery-lead.md)'s entrance into the workspace the [operator](../jtbd/persona-building-operator.md) later revises.

## Related

- [../problem-framing.md](../problem-framing.md) §4 — the assertion index, and §3 for the procurement context
- [candidate-beats-questions](candidate-beats-questions.md) — the claim this specializes to document-seeded starts
- [../principles/every-no-carries-its-reason.md](../principles/every-no-carries-its-reason.md) — a deviation is a "no" to the customer's own document, and it carries its rule
