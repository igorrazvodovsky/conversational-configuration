# Agreement document canvas

Recasts the canvas from a parameter sheet into the agreement's own genre: a layered service-agreement document — recitals, operative terms, schedules — rendered as a projection of solver state and editable in place through the existing canvas-edit grammar. Drawn and argued in the [canvas anatomy model](../../discovery/models/Canvas%20anatomy.md); the current sheet becomes the schedule layer, not a second view.

Serves discovery principles [elicitation uses the building's vocabulary, not the catalogue's](../../discovery/principles/elicit-in-the-buildings-vocabulary.md) — the record answers in the language elicitation speaks, instead of re-imposing catalogue terms at the primary surface — and [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). Puts the assertion [the representation of the agreement selects the user's moves](../../discovery/assertions/representation-selects-moves.md) under test.

## Stories

- As a building operator, the canvas reads as my agreement, not a parts list: what will happen at my building in plain language, the commitments with their price and footprint, and the machine spec as an annex — something I could defend to an owner as it stands.
- As a non-expert, technical values carry short situational glosses ("1000 kg — thirteen persons; a stretcher fits"), so I can make sense of the hardware annex without leaving the page or asking.
- As a reviser, every value remains editable in place exactly as on the sheet today — the document genre costs me no revision access, and invalid options stay physically unselectable.
- As a delivery lead, the full parameter schedule is still there, complete and tabular, one expansion away.

## Acceptance criteria

Layout:

- GIVEN a workspace with configuration state, WHEN the canvas renders, THEN the agreement appears as three layers in order: *recitals* (the site, the situation from the `context` group, and what will happen — installation, operation, term — as prose in building language), *operative terms* (the `agreement` and `performance` groups as numbered clauses, closing on the consideration: monthly price and modelled lifetime footprint), and *schedules* (the remaining hardware groups as the existing sheet, collapsible and collapsed by default).
- GIVEN any value shown in recitals or terms, WHEN it changes in agent state, THEN the rendered prose updates — the document is a projection with no drift, and recitals prose is produced by deterministic templates over state and model data, never composed by the model (constitution #6 extended to the record).
- GIVEN provenance and status data, WHEN the document renders, THEN who-chose-what and pending states use document-native marks — attribution and the deviation register in the margin beside the clause they qualify, on the sheet's rows in the schedules — preserving the same distinctions the sheet shows today: user-chosen, agent-chosen, rule-forced, open ([the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md)); open values show the candidate's proposal visually distinct. A variable is marked once, in the layer its group belongs to, even where another layer restates its value.
- GIVEN an empty configuration, WHEN the canvas renders, THEN the document renders as a skeleton — the same three layers with their values blank — with the existing invitation to describe the project in chat.

Editing:

- GIVEN any configurable value in any layer — including one embedded in recitals prose — WHEN the user activates it, THEN it opens the same option editor as today's canvas rows and dispatches the same hidden `Canvas edit:` structured message through the same solver-validated path, with invalid options greyed, price deltas shown, and the optimistic-overlay behavior unchanged. Nothing about the round trip changes.
- GIVEN a consequence-heavy technical value, WHEN it renders in any layer, THEN its situational gloss is derived from model display data, not composed at render time. Which values carry one is the model's own answer: an option annotated with a gloss is glossed wherever it appears, in a term as much as in a schedule.

## Relationship to RFQ reconciliation

The agreement document is the outbound half of a real-world genre pair whose inbound half is the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md)'s document: request and response, joined by the deviation register — a compliance matrix. The layering here explains that spec's stage boundary: a stage-1 RFQ speaks exactly the recitals and operative-terms layers and lacks the schedules; a prescriptive RFQ is one that enters the schedule layer. Both specs record the seam between them. Because rfq-reconciliation landed first, this spec reconciles how the register is rendered: in recitals and operative terms a deviation is a margin mark on the affected clause ("your document asked X, clause N"), carrying the same moves it carried as row decoration; in the schedules it stays a row strip, because a schedule row *is* the sheet. Its moves and its wording are unchanged in both. The RFQ itself is never rendered as a surface. Both specs also share one discipline from opposite directions: text is never the state — inbound text is interpreted into solver-checked commitments, outbound prose is projected from them.

## Out of scope

Typed free-text editing of the document — the follow-on named in the [canvas anatomy model](../../discovery/models/Canvas%20anatomy.md) §4, to be specified separately once this surface exists. Export/print/PDF generation (the [service-agreement spec](../service-agreement/requirements.md)'s exclusion of contract document generation stands — this spec changes the live canvas's genre, it does not add an output artifact). Relocating in-chat repair sets onto the document (the pending amendment tracked by the [surface architecture model](../../discovery/models/Surface%20architecture.md) §2 — this spec builds its target surface but does not perform the move). Comparison-view placement; mobile layout.
