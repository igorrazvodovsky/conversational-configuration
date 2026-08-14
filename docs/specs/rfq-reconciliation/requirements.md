# RFQ reconciliation: document-seeded agreements

Status: implemented 2026-08-14; verified against both fixtures in the app. Deviations from the plan and known gaps are in [design.md](design.md).

Real procurement usually opens with an inbound requirements document rather than with a person at a configurator. This feature makes that document an entrance: paste the RFQ, and the agent extracts its requirements as recorded commitments (translation is the agent's work, while validity of the seeded candidate is the solver's, per constitution #1), the solver proposes a valid whole, and every requirement the whole cannot meet becomes a named *deviation*. The conversation's opening job changes from elicitation to reconciliation. Serves discovery principles [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md) — the document is its limiting case, specifying many variables at once — and [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md) — a deviation is a "no" to the customer's own document, traced to named rules. Tests the assertion [a document-seeded candidate with named deviations is better than manual compliance checking](../../discovery/assertions/seeded-candidate-with-named-deviations.md).

Scope is stage one only: the EaaS-world RFQ that already speaks outcome terms (capacity, uptime, response time, term, budget per month). Prescriptive hardware-parameter RFQs and their upward translation are named out of scope below and get their own spec on top of this machinery.

## Stories

- As a delivery lead, I paste or attach our tender's requirements in a new workspace and get back a complete valid agreement plus an explicit register of where it deviates from what we asked — instead of answering questions about a building the document already describes.
- As a delivery lead, I work the register down: for each deviation I can accept what is offered, adjust our requirement, or leave it open — and when a reconciliation move breaks something else, I see that at the moment I make the move, not later.
- As a delivery lead, I can always see what our document asked next to what the agreement now says: the RFQ stays a fixed reference the agreement visibly diverges from.
- As a customer, where the document is silent the agent asks — and only there; nothing the document settles is re-elicited.

## Acceptance criteria

Ingestion:

- GIVEN RFQ text, pasted or attached as a text file (authored fixture documents provided with the feature), WHEN it is ingested, THEN every extracted requirement lands as a recorded commitment carrying document provenance — its clause cited or quoted — and nothing is recorded that the document does not state. Requirements the extraction cannot map to a model variable are listed as unmapped, never silently dropped.
- GIVEN ingestion completes, WHEN the canvas renders, THEN document-sourced values are distinguishable from conversation-chosen and solver-forced values — a third provenance source, answering "why is this value here?" with "your document, clause N".

Seeding and deviations:

- GIVEN a document whose requirements are jointly satisfiable, WHEN the workspace is seeded, THEN the first candidate satisfies all of them and the agreement behaves like any other from that point on (no ceremony for the easy case).
- GIVEN a document whose requirements are jointly infeasible, WHEN seeded, THEN the candidate is a solver-valid whole satisfying a maximal subset of the requirements, and each unmet requirement appears as a deviation: requested value, offered value, and the named rules separating them — an unsat core involving that requirement — all solver-computed, never narrated (constitution #1, #6).
- The objective selecting among maximal subsets is *fewest deviations first, cheapest monthly completion as tie-break* — argued against the alternatives in [design.md](design.md); requirement weights are deferred to the prescriptive stage. (This was named unsettled at approval so approving the requirements did not silently decide it.)

Register and reconciliation:

- GIVEN deviations exist, WHEN the canvas renders, THEN the register is visible as state on the affected terms — requested versus offered, with a count — not only as chat narration, and it survives conversation switching and deletion (write-through to the workspace store, per the [agreement-workspace spec](../agreement-workspace/requirements.md)).
- GIVEN a deviation, WHEN the customer reconciles it, THEN three moves are available: accept the offered value (the requirement is *waived*, not forgotten), adjust the requirement and re-solve, or leave it open. Each move dispatches through the existing card grammar as one atomic tool call.
- GIVEN a reconciliation move that conflicts with other recorded choices or would unmeet another document requirement, WHEN applied, THEN it goes through the revision-with-repair flow of the [nonlinear-interaction spec](../nonlinear-interaction/requirements.md) — the ripple shows at the moment of the move, and a new deviation is never created silently.
- GIVEN reconciliation is finished, WHEN the customer asks where things stand, THEN the agent reports the agreement as clean against the document except for waived requirements, which remain listed as waived.

Frozen reference:

- GIVEN a document-seeded workspace, WHEN any amount of reconciliation and revision has happened, THEN the original document text and its extracted requirement set remain stored immutable in the workspace, and the deviation register is computed as the difference between that reference and the live agreement. Deleting every conversation loses only the discussion, not the record.

Gaps:

- GIVEN a document that leaves decisions open, WHEN seeding completes, THEN the agent's questions target only the gaps, and nothing the document settles is re-asked. Under-specification is as characteristic of real RFQs as over-constraint, so elicitation is retargeted rather than removed.

Service frame:

- GIVEN any seeded or reconciled candidate, WHEN it is presented, THEN it is quoted as €X/month over the term, never as capex (the [service-agreement spec](../service-agreement/requirements.md) holds unchanged).

## Relationship to the agreement document

The RFQ and the agreement are a genre pair: a request and a response, joined clause by clause. The deviation register is that join, in the form of a compliance matrix of requested versus offered. The [agreement-document spec](../agreement-document/requirements.md) renders the agreement in this genre, and its layers define the stage boundary structurally. A stage-1 RFQ speaks only the customer-legible layers (recitals and operative terms, i.e. the `agreement`, `context`, `performance` groups) and lacks the schedules, which the vendor derives; a prescriptive RFQ is one that enters the schedule layer.

Both specs record the seam between them. This spec landed first and the agreement-document spec closed it: a deviation on a recital or an operative term is now a margin mark on that clause ("your document asked X, clause N"), while a deviation in the schedules keeps the row strip designed here. The register's own content and moves are the same in both. The RFQ itself is never rendered as a surface either way. It stays reference text, and what deserves rendering is the register on the agreement (constitution #10).

## Out of scope

Prescriptive (hardware-parameter) RFQs and their upward translation into outcome terms belong to stage two and get their own spec. File parsing (PDF/DOCX) is out: text only, pasted or handed over as a text file, plus authored fixtures. Making a file readable is not this spec's job, because a text document attached in chat already reaches the agent as text ([chat attachments](../chat-attachments/requirements.md)); how a file becomes readable is decided there, while what a document means — extraction, provenance, deviations — is decided here. Vendor-side response tooling, multi-vendor comparison, and multi-party workspaces are also out: the user stays demand-side, and the RFQ is their own organization's upstream artifact, which is what preserves the articulation-barrier argument. Real tender documents are out as well; the fixtures are authored, and have the same epistemic status as the pricing data (see [problem-framing](../../discovery/problem-framing.md) §3).
