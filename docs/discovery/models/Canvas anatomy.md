Status: drafted 2026-08-14, for critique. It answers *how does one screen show a whole agreement plus its validity?* — the canvas-anatomy row of [direction](../direction.md), *Models to make* — sharpened into a genre question. The direction committed to *a negotiation over a living document*, what was built at the time was a parameter sheet with an agreement header, and the [agreement-document spec](../../specs/agreement-document/requirements.md) has since realigned it on this model. This model decides what genre the agreement is rendered in, which readings each part serves, and what "editable" means for a document that is a projection of solver state.

## 1. The readings

The artifact is asked to serve several distinct goals, and each demands a different kind of reading. The readings differ in access pattern and audience rather than in content, which is why they can be layers of one projection rather than rival representations.

| Reading | Whose | What it demands |
|---|---|---|
| *The commitment* — an agreement one can sign, forward, defend to a board | [Building operator](../jtbd/persona-building-operator.md), procurement | Document genre: durable, legible to others, self-contained |
| *The change in the world* — this machine, that address, installed by then, operating thus for the term | First contact; re-entry after weeks | Narrative, in the building's language; linear read for comprehension and confirmation |
| *Sense-making* — "what does 1000 kg mean for my lobby?" | The non-expert | Explanation attached to the thing being explained, at the moment of confusion |
| *The handoff* — the parameter table the shaft gets poured against | [Delivery lead](../jtbd/persona-delivery-lead.md) | Exactly the spec sheet: complete, tabular, unambiguous |
| *Revision* — find the term, change it | The operator, the primary persona | Random access; tables are good at this, prose is poor at it |

Constitution #3 makes multiplying projections nearly free, because every surface is computed from one solver-owned state. But [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md) requires *one* durable locus, so the resolution has to layer the readings inside one artifact rather than multiply artifacts.

## 2. The option field

| Option | What it would mean here | Verdict |
|---|---|---|
| Spec sheet, as built | Groups in model order, one row per variable, agreement header on top | Demoted to a layer. As the whole artifact it fails twice. The record answers in catalogue terms, so the articulation barrier removed at input re-enters at the primary surface ([elicitation uses the building's vocabulary](../principles/elicit-in-the-buildings-vocabulary.md), output side). And a sheet of labeled rows reads as a questionnaire someone pre-filled, which undercuts the genre half of [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md) |
| Several parallel canvases, one per reading, switchable | A quote view, a story view and a table view over the same state | Set aside. It dilutes the durable locus and reopens "which view is the record?", the failure [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md) names |
| Narrative-only document | The agreement as continuous prose | Set aside. It serves first-read comprehension but fails random access, and the primary persona is a reviser ([problem framing](../problem-framing.md), *Contextual statements*) |
| Layered contract genre | Recitals, operative terms and schedules — the structure real service agreements already have | *Chosen.* The genre solved the multi-representation problem internally: narrative for first contact, terms for negotiation, and annexed tables for handoff and fine-grained revision |

The choice puts an assertion under test, registered as [the representation of the agreement selects the user's moves](../assertions/representation-selects-moves.md). The shared visible object is the deictic ground of the dialogue, so a form pulls toward value-filling and a document pulls toward negotiation.

## 3. The anatomy

There are three layers, mapped onto the product model's own groups. The mapping is a presentation heuristic rather than model metadata, per [Surface architecture](Surface%20architecture.md), *What follows from the choice*.

*Recitals — the change in the world.* The parties, the site, which is the workspace's installation, the situation from `context` — building type, region, installation type, accessibility — and what will happen: installed thus, operating so, for the term. It is building language throughout, rendered from state by deterministic templates, because the record never carries model-composed prose. That is constitution #6's discipline extended from explanations to the document itself. The agent's free narration stays in chat, where [the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md) already puts it.

*Operative terms — the commitments.* The `agreement` group, the headline performance outcomes, monthly price and lifetime footprint, each with provenance. This is the negotiation surface, and the pending-revision artifacts and repair sets that [Ripple storyboard](Ripple%20storyboard.md), *The decision*, places document-side attach here.

*Schedules — the derived hardware.* The remaining groups as the current sheet, demoted to a collapsible annex. This is where the genre wins the scale argument the flat sheet loses: a real platform's hundreds of parameters can't fit a single sheet ([problem framing](../problem-framing.md), *Contextual statements*), but annexes collapse, so the document degrades gracefully where the sheet fails outright.

*Status vocabulary.* Provenance and pending states render in the document genre's native marks: tracked changes and marginal attribution. That makes the suggestion layer [Surface architecture](Surface%20architecture.md), *The option field*, borrowed a native pattern rather than an annotation grafted onto a form.

The layering is corroborated from outside. The stage-1 vocabulary of the [rfq-reconciliation spec](../../specs/rfq-reconciliation/requirements.md) — `agreement`, `context` and `performance` only — is exactly the recitals and operative-terms layers, drawn independently. A stage-1 RFQ is this document with no schedules: the customer's half of the genre pair, whose deviation register is the join between the two documents, a compliance matrix. Stage 2 begins where a document enters the schedule layer. On a document-genre canvas, deviations render as margin marks on the affected terms, and the seam is stated in both specs.

*Sense-making* isn't a fourth layer. It is situational glosses in place on technical values — "1000 kg — thirteen persons; a stretcher fits" — derived from model data, with everything longer answered in chat.

## 4. Editability — the finality problem

Document genre connotes finality, and the direction has no start and no finish. "Editable" splits into two readings with very different costs.

*Editable islands* were chosen first. Every configurable value in any layer is an interactive token opening the same option editor and dispatching the same hidden structured message as the canvas rows. That is one grammar and no new machinery, and the finality connotation is answered by affordance alone (constitution #10).

*Typed edits as utterances* are the follow-on. The user strikes "November", types "September", and that counts as a move: the text delta is lifted into the structured grammar, interpreted by the agent, validated by the solver, and the document re-renders from state. The keystrokes never persist, because *the document is a projection, never a store* (constitution #3), and what persists is what the user meant. Text that maps to no variable isn't an error but a negotiation opening, answered in chat. Under this reading, typing into the document and speaking in chat are the same act on different surfaces, and the document becomes a place the conversation happens.

One sub-choice is unresolved, and has to be drawn before building. Either the typed edit applies optimistically and snaps back on rejection, which is the canvas's pattern, or it renders as a tracked-changes suggestion the solver then confirms, which would let the redlining vocabulary carry both parties' proposals.

The candidate mechanism is ProseMirror or Tiptap, for inspectable edit transactions. Their collaboration and persistence features are exactly the duplicate store constitution #3 prohibits, and have to stay unused. The living-document implementations on record treat text as the state ([the unshipped intersection](../../research/gaps.md#unshipped-intersection) and [the living-document teardown](../../research/gaps.md#living-document-teardown)), and a document whose text edits are interpreted against a solver is the unshipped part. It is already designed at a different grain, though: `ingest_rfq` in the [rfq-reconciliation spec](../../specs/rfq-reconciliation/design.md) is text interpreted against the solver at document scale, with clauses lifted into `(variable, value)` commitments, the unmappable surfaced rather than invented, and the text kept as reference and never as state. The typed-edit follow-on therefore inherits a mechanism that will already have been exercised.

## 5. Failure signals for the walkthrough

- Recitals are scrolled past every session. The narrative layer is decoration, so demote it to a summary line.
- Revision sessions go straight to the expanded schedules and never touch the terms layer. The terms altitude is wrong, and the sheet was the right genre after all.
- The document is read but every change still arrives through chat. Editable islands failed as affordance, which is distinct from the document succeeding at comprehension.
- The move mix over the document matches the move mix over the sheet. [The representation of the agreement selects the user's moves](../assertions/representation-selects-moves.md) fails, and the genre choice loses its main argument.

## 6. What this changes downstream

- Spec work: the [agreement-document spec](../../specs/agreement-document/requirements.md) built the layered document with editable islands, and typed edits are its named follow-on, specified separately now that there is a document to type into.
- The pending amendment moving repair sets document-side ([Surface architecture](Surface%20architecture.md), *What follows from the choice*) has its target surface, the terms layer, now built.
- The session map, the missing model in [direction](../direction.md), *Models to make*, inherits a likely answer: re-entry as a narrative "state of the agreement since you left", hosted by the recitals.
- The comparison view inherits the layering as a hypothesis: two documents differ at the terms level first, with the schedule diff one move down, which is the same shape [Ripple storyboard](Ripple%20storyboard.md), *The decision*, chose. Since [parallel drafts](../../specs/parallel-drafts/requirements.md), the two sides are literally documents of this anatomy, so the hypothesis is that a comparison is read in the same three layers as the thing compared, and the layering is testable rather than analogical.

## Related

- [The geometry this anatomy fills in](Surface%20architecture.md), whose open edge on per-artifact form is answered here
- [The document-side artifacts the terms layer hosts](Ripple%20storyboard.md)
- Principles drawn against: [elicitation uses the building's vocabulary](../principles/elicit-in-the-buildings-vocabulary.md), [the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md), [configuration can start from any variable, in any order](../principles/start-from-any-variable.md), [the agent proposes and the user decides](../principles/agent-proposes-user-decides.md)
- Assertions put under test: [the representation of the agreement selects the user's moves](../assertions/representation-selects-moves.md), [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md)
- [The model index](../direction.md)
